(ns cumulus.provider-gateway.activity-handler
  "TODO
  TODO rename this to download request activity handler or something like that."
  (:require
   [clojure.core.async :as a]
   [com.stuartsierra.component :as c]
   [cumulus.provider-gateway.aws.activity-api :as activity]
   [cumulus.provider-gateway.util :as util]
   [cumulus.provider-gateway.aws.s3 :as s3]))

(def COMPLETION_CHANNEL_BUFFER_SIZE
  "TODO"
  5)

(defprotocol TaskToRequests
  "Converts an input task from the activity API into a set of requests (download, upload, etc)
   to process and handles converting the response back into an action to complete"

  (handle-new-task
   [this task]
   "Takes a new task received from the activity api converts it into a map with the list of requests
    to process.")

  ;; TODO update process task so that the completion request includes which things succeeded and which
  ;; failed
  (handle-completed-task
   [this completion-request]
   "Takes a completed task response and does any final cleanup needed. Returns data to return as
    output of the step function request."))

(defn start-activity-reader-thread
  "TODO"
  [running-atom activity-api task-to-requests-handler task-channel completion-channel]
  (a/thread
   (while @running-atom
     (if-let [task (activity/get-task activity-api)]
       (let [_ (println (format "Read task from activity api %s" (pr-str task)))
             ;; TODO track task start time here and log it's completion time in the completer thread.
             ;; Call handle-new-task to take the task from the API and figure out what needs to be
             ;; downloaded, uploaded, etc.
             task (handle-new-task task-to-requests-handler task)
             ;; Put the completion channel in the task so we'll get a message when the task is
             ;; finished.
             task (assoc task :completion-channel completion-channel)]
         (a/>!! task-channel task))))
   (println "Activity reader thread completed")))

(defn start-activity-completer-thread
  "TODO"
  [activity-api task-to-requests-handler completion-channel]
  (a/thread
   (util/while-let
    [{:keys [type task-token] :as completion-request} (a/<!! completion-channel)]
    (println (format "Handling completion request %s" (pr-str completion-request)))
    (let [output (handle-completed-task task-to-requests-handler completion-request)]
      (if (:success completion-request)
        (activity/report-task-success activity-api task-token output)
        (activity/report-task-failure
         activity-api task-token "FAILURE" (:error completion-request)))))))

;; TODO
(defrecord ActivityHandler
  [
   ;; Instance of activity protocol for fetching activities
   activity-api

   task-to-requests-handler

   ;; A channel containing tasks that the activity handler has read.
   task-channel

   ;; Runtime state

   ;; a channel of completion response messages to send.
   completion-channel

   ;; TODO
   running-atom

   ;; TODO
   reader-ch

   ;; TODO
   completer-ch]


  c/Lifecycle
  (start
   [handler]
   (if @running-atom
     handler
     (do
       (reset! running-atom true)
       (let [completion-channel (a/chan COMPLETION_CHANNEL_BUFFER_SIZE)
             completer-thread-ch (start-activity-completer-thread
                                  activity-api task-to-requests-handler completion-channel)
             reader-thread-ch (start-activity-reader-thread
                               running-atom activity-api task-to-requests-handler task-channel
                               completion-channel)]
         (assoc handler
                :completion-channel completion-channel
                :completer-ch completer-thread-ch
                :reader-ch reader-thread-ch)))))

  (stop
   [handler]
   (if (not @running-atom)
     handler
     (do
       (reset! running-atom false)
       ;; Close the completion channel so the activity completer thread will stop.
       (a/close! completion-channel)
       (a/<!! reader-ch)
       (a/<!! completer-ch)
       (dissoc handler :completer-ch :reader-ch)))))

(defn- message->meta-key
  "Returns the meta key to use from a message"
  [message]
  (let [meta (:meta message)]
    (or (:key meta) (:collection meta))))

(defn- message->private-bucket
  "Returns the name of the private bucket from a message."
  [message]
  (get-in message [:resources :buckets :private]))

(defn load-payload
  "Loads the payload from the task which could be stored in an intermediate representation on S3."
  [s3-api task]
  (when-let [payload (get-in task [:input :payload])]
    (let [{bucket :Bucket key :Key} payload]
      (if (and bucket key)
        (s3/read-s3-json s3-api bucket key)
        payload))))

(defn load-config
  "TODO"
  [task-name task]
  (let [message (:input task)
        config (get-in message [:workflow_config_template (keyword task-name)])]
    ;; Replace all the mustache stuff
    (util/populate-message-config-replacements message config)))

(defn default-handle-new-task
  "TODO"
  [task-name s3-api task]
  (let [payload (load-payload s3-api task)
        config (load-config task-name task)]
    (-> task
        (assoc :original-message (:input task))
        (assoc :config config)
        ;; Replace the task input with the payload that we're processing.
        (assoc :input payload))))

(defn upload-large-payload
  "Upl"
  [task-name s3-api config message]
  (if (:skip_upload_output_payload_to_s3 config)

    ;; Skip upload and return message with payload data in place.
    message

    ;; Upload the resulting payload to s3
    (let [private-bucket (message->private-bucket message)
          payload-location (str task-name "/" (message->meta-key message))]
      (s3/write-s3-json s3-api private-bucket payload-location (:payload message))
      ;; Create the output message to pass to the next task
      (assoc message :payload {:Bucket private-bucket :Key payload-location}))))

(defn default-handle-completed-task
  "TODO"
  [task-name s3-api completion-request]

  ;; We return a message with a payload pointing to an S3 bucket with a list of the files that
  ;; were successfully downloaded.
  (let [message (-> completion-request
                    :original-message
                    (assoc-in [:payload :files] (:results completion-request)))]
    (upload-large-payload task-name s3-api (:config completion-request) message)))

(def TASK_NAME
  "DownloadActivity")

(defrecord DefaultTaskHandler
  [s3-api]
  TaskToRequests

  (handle-new-task
   [_ task]
   (default-handle-new-task TASK_NAME s3-api task))

  (handle-completed-task
   [_ completion-request]
   (default-handle-completed-task TASK_NAME s3-api completion-request)))

(defn create-activity-handler
  "TODO"
  ([activity-api]
   (create-activity-handler activity-api (->DefaultTaskHandler s3/aws-s3-api)))
  ([activity-api task-to-requests-handler]
   (map->ActivityHandler {:activity-api activity-api
                          :task-to-requests-handler task-to-requests-handler
                          :running-atom (atom false)})))

