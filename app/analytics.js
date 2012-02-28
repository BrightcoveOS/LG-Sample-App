var Analytics = (function(window, $) {
  var document = window.document,
      video,
      timeWatched = 0,
      previousTimeStamp,
      previousTime = 0,
      milestones = {},
      config;
  
  function Analytics() {
    this.init.apply(this, arguments);
  }
  
  Analytics.prototype = {
    constructor: Analytics,
    
    init: function(pVideo) {
      video = pVideo;
      
      config = LG.config;
      
      _gaq.push(['_setAccount', config.ga_token]);
      _gaq.push(['_setDomainName', 'none']);
      _gaq.push(['_trackPageview', config.app_name]);
      
      video.addEventListener("change", $.proxy(this.handleChange, this));
      video.addEventListener("begin", $.proxy(this.handleBegin, this));
      video.addEventListener("play", $.proxy(this.handlePlay, this));
      video.addEventListener("pause", $.proxy(this.handlePause, this));
      video.addEventListener("stop", $.proxy(this.handleStop, this));
      video.addEventListener("progress", $.proxy(this.handleProgress, this));
      video.addEventListener("complete", $.proxy(this.handleComplete, this));
      video.addEventListener("adStart", $.proxy(this.handleAdStart, this));
      video.addEventListener("adComplete", $.proxy(this.handleAdComplete, this));
    },
    
    trackEvent: function(event, data) {
      if (!video.getCurrentVideo() || video.getCurrentVideo().id == null) {
        return;
      }

      var tracking = ['_trackEvent', config.app_name, event, video.getCurrentVideo().id.toString()];

      if (data) {
        tracking.push(data);
      }
      _gaq.push(tracking);
    },
    
    handleChange: function(event) {
      this.trackEvent("Video Load");
    },
    
    handleBegin: function(event) {
      this.trackEvent("Media Begin");
      previousTimeStamp = new Date().getTime();
      timeWatched = 0;
      previousTime = 0;
      this.setupMilestones();
    },
    
    handlePlay: function(event) {
      this.trackEvent("Media Resume");
    },
    
    handlePause: function(event) {
      this.trackEvent("Media Pause");
    },
    
    handlePause: function(event) {
      this.trackEvent("Media Stop");
    },
    
    handleProgress: function(event) {
      this.updateTrackedTime();
      
      var currentTime = video.getVideoPosition();
      if (currentTime !== previousTime) {
        this.checkMilestones();
        previousTime = currentTime;
      }
    },
    
    handleComplete: function(event) {
      this.trackEvent("Media Complete", Math.round(timeWatched).toString());
    },
    
    updateTrackedTime: function() {
      var currentTimeStamp = new Date().getTime();
      var timeElapsed = (currentTimeStamp - previousTimeStamp)/1000;
      timeWatched += timeElapsed;
      previousTimeStamp = currentTimeStamp;
    },
    
    handleAdStart: function(event) {
      this.trackEvent("Ad Start");
      milestones = {};
    },
    
    handleAdComplete: function(event) {
      this.trackEvent("Ad Complete");
    },
    
    setupMilestones: function() {
      var duration = video.getVideoDuration();
      
      milestones = {};
      milestones[Math.round(duration*0.25)] = "25% Milestone Passed";
      milestones[Math.round(duration*0.50)] = "50% Milestone Passed";
      milestones[Math.round(duration*0.75)] = "75% Milestone Passed";
    },
    
    checkMilestones: function() {
      var currentTime = video.getVideoPosition();
      if (milestones[currentTime]) {
        this.trackEvent(milestones[currentTime]);
      }
    }
  };
  
  return Analytics;
  
})(window, $);
