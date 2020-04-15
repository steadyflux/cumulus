/**
 * S3 server access logs are being indexed into the metrics team's Elasticsearch server. This code
 * will take a bucket as an argument and query the metrics ES server for all of the REST.GET.OBJECT
 * actions that have been indexed for that bucket. Once it has those log entries, it will group them
 * by egress destination and sum the total number of bytes transferred to each destination.
 *
 * Given the "Remote IP" in the S3 server access logs and the list of Amazon IPs that AWS provides,
 * we are able to break the results up into the following groups:
 *
 * - "private-ip": this is the case when the request came from one of our VPCs. Given the
 *   the information available, there is not a way to use that IP to determine which VPC the request
 *   came from, and is therefore no good way to determine what region the request came from.
 * - "cloudfront": the S3 object was requested by Cloudfront. These requests do not have a region
 *   associated with them.
 * - "same-region": The request came from another AWS service in the same region as the bucket.
 * - "<region>": The region that the S3 object was sent to, which is different than the region that
 *   the S3 bucket belongs to.
 */

 'use strict';

const CIDRMatcher = require('cidr-matcher');
const get = require('lodash/get');
const got = require('got');
const pReduce = require('p-reduce');
const { Client } = require('@elastic/elasticsearch');
const { S3 } = require('aws-sdk');

const getBucketRegion = async (bucket) => {
  const response = await (new S3()).getBucketLocation({ Bucket: bucket }).promise();
  if (response.LocationConstraint === '') return 'us-east-1';
  return response.LocationConstraint;
};

const fetchAwsIpRanges = async () => {
  const ipRangesFile = await got('https://ip-ranges.amazonaws.com/ip-ranges.json').json();

  return [
    ...ipRangesFile.prefixes,
    ...ipRangesFile.ipv6_prefixes.map((p) => ({ ...p, ip_prefix: p.ipv6_prefix }))
  ];
};

const isPrivateIp = (ip) => {
  const matcher = new CIDRMatcher([
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    'fc00::/7'
  ]);

  return matcher.contains(ip);
};

const isIpInRange = (ip, ipRange) => (new CIDRMatcher([ipRange])).contains(ip);

const findMatchingAwsIpRanges = (awsIpRanges, ip) =>
  awsIpRanges.filter((awsIpRange) => isIpInRange(ip, awsIpRange.ip_prefix));

const getIpSourceType = ({
  amazonAwsIpRanges, bucketRegion, clientip, serviceAwsIpRanges
}) => {
  if (isPrivateIp(clientip)) return 'private-ip';

  const matchingServiceAwsIpRanges = findMatchingAwsIpRanges(serviceAwsIpRanges, clientip);
  switch (matchingServiceAwsIpRanges.length) {
  case 0:
    break;
  case 1:
    if (matchingServiceAwsIpRanges[0].service === 'CLOUDFRONT') return 'cloudfront';
    if (matchingServiceAwsIpRanges[0].region === bucketRegion) return 'same-region';
    return matchingServiceAwsIpRanges[0].region;
  default:
    throw new Error(`Expected 0 or 1 matches, but got: ${JSON.stringify(matchingServiceAwsIpRanges)}`);
  }

  const matchingAmazonAwsIpRanges = findMatchingAwsIpRanges(amazonAwsIpRanges, clientip);
  switch (matchingAmazonAwsIpRanges.length) {
  case 0:
    break;
  case 1:
    if (matchingAmazonAwsIpRanges[0].region === bucketRegion) return 'same-region';
    return matchingAmazonAwsIpRanges[0].region;
  default:
    throw new Error(`Expected 0 or 1 matches, but got: ${JSON.stringify(matchingAmazonAwsIpRanges)}`);
  }

  return 'internet';
};

const main = async (bucket) => {
  const esClient = new Client({
    node: 'https://xxx',
    auth: {
      username: 'xxx',
      password: 'xxx'
    }
  });

  const logs = [];

  let response = await esClient.search({
    index: '*-s3_access_logs-*',
    scroll: '10s',
    size: 1000,
    _source: ['clientip', 'bytes'],
    body: {
      query: {
        bool: {
          filter: [
            {
              term: { 'bucket.keyword': bucket }
            },
            {
              term: {
                'operation.keyword': 'REST.GET.OBJECT'
              }
            }
          ]
        }
      }
    }
  });

  while (response.body.hits.hits.length > 0) {
    Array.prototype.push.apply(logs, response.body.hits.hits.map((x) => x._source));

    response = await esClient.scroll({
      scrollId: response.body._scroll_id,
      scroll: '10s'
    });
  }

  const bucketRegion = await getBucketRegion(bucket);

  const allAwsIpRanges = await fetchAwsIpRanges();
  const amazonAwsIpRanges = allAwsIpRanges.filter((awsIpRange) => awsIpRange.service === 'AMAZON');
  const serviceAwsIpRanges = allAwsIpRanges.filter((awsIpRange) => awsIpRange.service !== 'AMAZON');

  return pReduce(
    logs,
    async (result, log) => {
      const sourceType = await getIpSourceType({
        clientip: log.clientip,
        bucketRegion,
        amazonAwsIpRanges,
        serviceAwsIpRanges
      });

      result[sourceType] = get(result, sourceType, 0) + log.bytes;
      return result;
    },
    {}
  );
};

main('bucket-name')
  .then((x) => console.log(JSON.stringify(x, null, 2)))
  .catch((err) => console.error(JSON.stringify(err, null, 2)));
