var VideoPlayer = (function(window, $) {
  var holder,
      intervalId,
      adpolicy;
  
  function VideoPlayer() {
    this.init.apply(this, arguments);
    $.extend(true, this, events);
  }
  
  $.extend(VideoPlayer.prototype, {
    constructor: VideoPlayer,
    
    init: function(element, policy) {
      holder = element;
      adpolicy = policy;
      
      this.video;
      this.jqxhr;
      this.adPlaying = false;
      this.buffering = false;
      this.connecting = false;
      this.firstPlay = false;
      this.seekTimer = null;
      this.seekPosition = 0;
      this.currentVideo = undefined;
      this.isInfoVideo = false;
      this.isPaused = false;
      
      this.insertPlayer();
      this.setupListeners();
    },
    
    insertPlayer: function() {
      holder.html(this.generatePlayer);
      this.video = $("#media")[0];
    },
    
    generatePlayer: function() {
      return '<div id="video-container"><object id="media" type="video/mp4" width="1280" height="720" downloadable="false"></object></div>';
    },
    
    setupListeners: function() {
      this.video.onPlayStateChange = $.proxy(this.handlePlayStateChange, this);
    },
    
    checkVideoPosition: function(event) {
      this.handleProgress();
    },
    
    getCurrentVideo: function() {
      return this.currentVideo;
    },
    
    getVideoDuration: function() {
      if (this.adPlaying) {
        if (isNaN(this.video.playTime)) {
          return 0;
        }
        return Math.round(this.video.playTime/1000);
      }
      if (this.currentVideo == undefined) {
        return 0;
      }
      return Math.round(this.currentVideo.length/1000);
    },
    
    getVideoPosition: function() {
      if (this.currentVideo === undefined) {
        return 0;
      }
      if (isNaN(this.video.playPosition)) {
        return 0;
      }
      return Math.round(this.video.playPosition/1000);
    },
    
    loadVideo: function(id) {
      // abort any active calls
      if (this.jqxhr) {
        this.jqxhr.abort();
      }
      this.previousVideo = this.currentVideo;
      this.currentVideo = undefined;
      this.dispatchEvent(this.createMediaEvent("beforeload"));
      this.firstPlay = true;
      var url = LG.api.api_url + "?" + LG.api.api_params + "&media_delivery=" + LG.config.media_delivery + "&command=find_video_by_id&video_id=" + id + "&token=" + LG.config.token + "&callback=?";
      this.jqxhr = $.ajax(url, {
        dataType: "json",
        success: $.proxy(this.handleVideoLoad, this),
        error: $.proxy(this.handleError, this)
      });
    },
    
    playVideo: function(url) {
      this.video.data = url;
      this.setTimer();
      this.play();
    },
    
    play: function() {

      // object tag needs listeners re-bound
      LG.isNative && this.setupListeners();

      this.video.play(1);
      this.isPaused = false;
    },
    
    pause: function() {
      this.video.play(0);
      this.isPaused = true;
    },
    
    stop: function() {
      this.pause();
    },

    fastForward: function() {
      this.video.seek( this.video.playPosition + 10000 );
      this.isPaused && this.handleProgress();
    },

    rewind: function() {
      var pos = this.video.playPosition - 10000;

      if( pos < 0 ) {
        pos = 0;
      }

      this.video.seek(pos);
      this.isPaused && this.handleProgress();
    },
    
    stopSeek: function() {
      clearTimeout(this.seekTimer);
      this.seekState = null;
    },

    isPlaying: function() {
      return this.video.playState == 1;
    },
    
    isAdPlaying: function() {
      return this.adPlaying;
    },
    
    handleVideoLoad: function(data) {
      this.jqxhr = null;
      
      if (data.error) {
        this.dispatchEvent("error", data.error);
        return;
      }

      this.currentVideo = data;
      this.dispatchEvent(this.createMediaEvent("change"));
      
      // check for pre-roll
      adpolicy.checkPreroll(this.currentVideo, $.proxy(this.handlePreroll, this));
    },
    
    findVideoUrl: function(media) {
      if (LG.config.media_delivery === "http_ios") {
        return media.FLVURL;
      }

      for (var i = 0; i < media.renditions.length; i++) {
        var rendition = media.renditions[i];
        if (rendition.videoCodec == "H264" && rendition.frameWidth >= 1024) {
          return rendition.url;
        }
      }
      
      // if we get this far, just return the first rendition found.
      return media.renditions[ 0 ].url;
    },
    
    playCurrentVideo: function() {
      var url = this.findVideoUrl(this.currentVideo);

      if (url) {
        this.playVideo(url);
        this.dispatchEvent("load", this.currentVideo);
      } else {
        this.currentVideo = this.previousVideo;
        this.dispatchEvent("error", {
          type: "invalidURL"
        });
      }
    },
    
    //for cleaning up the current ad settings when the ad is stopped or back button is clicked. 
    clearAd: function(){
      adpolicy.clearYuMeSDK();
      this.clearTimer();
    },
    
    handlePreroll: function(data) {
      if (data && data.ad) {
        if(data.ad === "ad_playing"){
          this.dispatchEvent("adStart");
          this.adPlaying = true;
          this.handlePlayStateChange();
          this.setTimer(); // start the timer to show progress while ad playing
          LG.isNative && this.setupListeners();
        }
        if(data.ad === "ad_complete"){
          this.clearTimer();
          this.handlePlayStateChange();
          LG.isNative && this.setupListeners();
        }
        if(data.ad === "ad_error"){
          this.clearTimer();
          this.playCurrentVideo();
        }
      } else {
        this.playCurrentVideo();
      }
    },
    
    handleVideoLoadError: function(data) {
      this.jqxhr = null;
      this.dispatchEvent("error", {
        type: "load"
      });
    },
    
    handlePlayStateChange: function() {
      // if we were buffering before and the current
      // play state has changed then buffering is done
      if (this.buffering && this.video.playState != 4) {
        this.buffering = false;
        this.handleBufferEnd();
      }
      
      // if we were connecting before and the current
      // play state has changed then connecting is done
      if (this.connecting && this.video.playState != 3) {
        this.connecting = false;
        this.handleConnectEnd();
      }
      
      switch (this.video.playState) {
        case 0: // stopped
          this.clearTimer();
          this.handleStop();
          break;
        case 1: // playing
          this.setTimer();
          this.handlePlay();
          break;
        case 2: // paused
          this.clearTimer();
          this.handlePause();
          break;
        case 3: // connecting
          this.clearTimer();
          this.connecting = true;
          this.handleConnectBegin();
          break;
        case 4: // buffering
          this.clearTimer();
          this.buffering = true;
          this.handleBufferStart();
          break;
        case 5: // finished
          this.clearTimer();
          this.handleComplete();
          break;
        case 6: // error
          this.clearTimer();
          this.handleError();
          break;
      }
    },
    
    handleProgress: function(event) {
      this.dispatchEvent(this.createMediaEvent("progress"));
    },
    
    handleStop: function(event) {
      if (this.adPlaying) return;
      this.dispatchEvent(this.createMediaEvent("stop"));
    },
    
    handlePlay: function(event) {
      // if this is the first play event, 
      // then dispatch a begin event as well
      if (this.firstPlay) {
        if (this.adPlaying) {
          this.dispatchEvent("adStart");
        } else {
          this.dispatchEvent(this.createMediaEvent("begin"));
        }
        this.firstPlay = false;
      }
      if (this.adPlaying) return;
      this.dispatchEvent(this.createMediaEvent("play"));
    },
    
    handlePause: function(event) {
      if (this.adPlaying) return;
      this.dispatchEvent(this.createMediaEvent("pause"));
    },
    
    handleComplete: function(event) {
      if (this.adPlaying) {
        this.adPlaying = false;
        this.firstPlay = true;
        this.dispatchEvent("adComplete");
        this.playCurrentVideo();
      } else {
        this.dispatchEvent(this.createMediaEvent("complete"));
      }
    },
    
    handleConnectBegin: function(event) {
      if (this.adPlaying) return;
      this.dispatchEvent(this.createMediaEvent("connectBegin"));
    },
    
    handleConnectEnd: function(event) {
      if (this.adPlaying) return;
      this.dispatchEvent(this.createMediaEvent("connectEnd"));
    },
    
    handleBufferStart: function(event) {
      if (this.adPlaying) return;
      this.dispatchEvent(this.createMediaEvent("bufferBegin"));
    },
    
    handleBufferEnd: function(event) {
      if (this.adPlaying) return;
      this.dispatchEvent(this.createMediaEvent("bufferEnd"));
    },
    
    handleError: function(event) {
      if(event.statusText === "abort") {
        return;
      }

      this.dispatchEvent("error");
    },
    
    clearTimer: function() {
      clearInterval(intervalId);
      intervalId = null;
    },
    
    setTimer: function() {
      if (intervalId) return;
      intervalId = setInterval($.proxy(this.checkVideoPosition, this), 500);
    },
    
    createMediaEvent: function (type) {
      return {type: type, duration: this.getVideoDuration(), position: Math.round(this.video.playPosition/1000)};
    }
  });
  
  return VideoPlayer;
  
})(window, $);
// if we're dealing with a regular web browser then override
// the methods needed to render a HTML5 video experience
if (new String(navigator.userAgent).search(/LG Browser/) === -1) {
  VideoPlayer.prototype.generatePlayer = function() {
    return '<div id="video-container"><video id="media" width="1280" height="720" /></div>';
  };
  
  VideoPlayer.prototype.setupListeners = function() {
    this.video.addEventListener("timeupdate", $.proxy(this.handleProgress, this));
    this.video.addEventListener("ended", $.proxy(this.handleComplete, this));
    this.video.addEventListener("pause", $.proxy(this.handlePause, this));
    this.video.addEventListener("play", $.proxy(this.handlePlay, this));
    this.video.addEventListener("error", $.proxy(this.handleError, this));
  };
  
  VideoPlayer.prototype.isPlaying = function() {
    return !this.video.paused;
  };
  
  VideoPlayer.prototype.getVideoDuration = function() {
    if (this.adPlaying) {
      if (isNaN(this.video.duration)) {
        return 0;
      }
      return Math.round(this.video.duration);
    }
    if (this.currentVideo == undefined) {
      return 0;
    }
    return Math.round(this.currentVideo.length/1000);
  };
  
  VideoPlayer.prototype.getVideoPosition = function() {
    if (isNaN(this.video.currentTime)) {
      return 0;
    }
    return Math.round(this.video.currentTime);
  };
  
  VideoPlayer.prototype.playVideo = function(url) {
    this.video.src = url;
    this.play();
  };
  
  VideoPlayer.prototype.play = function() {
    this.video.play();
  };
  
  VideoPlayer.prototype.pause = function() {
    this.video.pause();
  };
  
  VideoPlayer.prototype.stop = function() {
    this.video.pause();
  };

  VideoPlayer.prototype.fastForward = function() {
    this.video.currentTime += 15;
  };

  VideoPlayer.prototype.rewind = function() {
    this.video.currentTime -= 15;
  };

  VideoPlayer.prototype.createMediaEvent = function(type) {
    return {type: type, duration: Math.round(this.video.duration), position: Math.round(this.video.currentTime)};
  };
}
