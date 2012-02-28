var AdPolicy = (function(window, $) {
  var document = window.document;
  
  function AdPolicy() {
    this.init.apply(this, arguments);
  }
  
  $.extend(AdPolicy.prototype, events, {
    constructor: AdPolicy,
    
    init: function() {
      this.jqxhr;
      this.counter = 0;
	  
      //Yume variables
      this.yumeSDKInstance=null;
      this.yumeInitObj;
      this.callback;	  
    },
    
    checkPreroll: function(media, callback) {
      if (this.counter > 0) {
        this.counter--;
      }

      // check to see if a pre-roll needs to be played
      if (LG.config.preroll_ads && this.counter == 0) {
        this.counter = LG.config.title_ad_play_interval;

        // abort any active calls
        if (this.jqxhr) {
          this.jqxhr.abort();
        }
        
        /*var url = LG.config.ad_server_url + "?" + LG.config.preroll_ad_keys;
        this.jqxhr = $.ajax(url, {
          dataType: "json",
          success: $.proxy(this.handlePrerollLoad, this, callback),
          error: $.proxy(this.handlePrerollError, this, callback)
        });
        
        setTimeout($.proxy(this.handlePrerollLoad, this, {ad: 'http://psdev.brightcove.com/lg/ads/beetle_ad.mp4'}, callback), 200)
        */

        this.callback = callback;

        if( this.yumeSDKInstance == null ){
          this.initYuMeSDK();
        }

        if( this.yumeSDKInstance ){
          this.startYuMeSDK();
        } else {
          callback();
        }
      } else {
        callback();
      }
    },
    
    handlePrerollLoad: function(data, callback) {
      callback(data);
    },
    
    handlePrerollError: function(data, callback) {
      callback();
    },
        
    //Yume SDK Initialization function
    initYuMeSDK: function(){
      this.yumeSDKInstance = new YuMeHTML5SDK();
      var config = LG.config;

      if(!this.yumeSDKInstance) {
        // If the instance is not created correctly we call back the video to play content.
        this.handlePrerollError();
        return;
      }

      // get the adder (or) remover object from the SDK
      this.eventAdderRemover = this.yumeSDKInstance.yume_getEventAdderRemoverObject();

      // get the browser detector object from the SDK
      this.browserDetector = this.yumeSDKInstance.yume_getBrowserDetectorObject();

      this.yumeInitObj = new YuMeHTML5SDKInitObject();
      this.yumeInitObj.adDomainUrl = config.ad_server_url;
      this.yumeInitObj.domainId = config.yume_domain_id;
      this.yumeInitObj.qsParams = config.yume_qs_params;
      this.yumeInitObj.html5VideoDivId = "video-container"; //this value needs to be the same as the HTML5 video div element's id
      this.yumeInitObj.html5VideoId = "media"; //this value needs to be the same as the HTML5 video element's id

      /* playlist support */
      this.yumeInitObj.prerollPlaylist = config.yume_preroll_playlist;

      /* Prefetch support disabling - by default prefetching is enabled in YuMe HTML5 SDK */
      this.yumeInitObj.bPrefetchMidrollAd = false;
      this.yumeInitObj.bPrefetchPostrollAd = false;		

      /* video timeout and video timeout poll intervals */
      this.yumeInitObj.videoTimeoutInterval = 4; //seconds
      this.yumeInitObj.videoTimeoutPollInterval = 500; //milliseconds

      this.yumeInitObj.yumeSDKAdEventListener = $.proxy(this.yumeSDKAdEventListener, this);

      this.bYumeSDKInit = this.yumeSDKInstance.yume_init(this.yumeInitObj);

      if(!this.bYumeSDKInit) {
        delete yumeInitObj;
        callback();
        return;
      }

      delete yumeInitObj;
    },

    //Request for new ad request and plays an ad
    startYuMeSDK: function(){
      this.yumeSDKInstance.yume_startAd(YuMeHTML5SDK.prototype.yume_adBlockType.PREROLL_BLOCK);
    },

    //Clears the sdk parameters for current running ad is been stopped or back button is pressed
    clearYuMeSDK: function(){
      this.yumeSDKInstance.yume_removeAd();
    },

    //Deinitializing the yume sdk.
    deinit: function(){
      this.yumeSDKInstance.yume_deInit();
    },

    //Listeners handles the events dispatched by the Yume sdk.
    yumeSDKAdEventListener: function(yume_event, yume_eventInfo){
      switch(yume_event) {
        case YuMeHTML5SDK.prototype.yume_adEvent.AD_PRESENT:
          break;
        case YuMeHTML5SDK.prototype.yume_adEvent.AD_PLAYING:
          this.callback({ad: 'ad_playing'});
        break;
        case YuMeHTML5SDK.prototype.yume_adEvent.AD_ABSENT:
          case YuMeHTML5SDK.prototype.yume_adEvent.AD_ERROR:
            this.callback({ad: 'ad_error'});
        break;
        case YuMeHTML5SDK.prototype.yume_adEvent.AD_COMPLETED:
          this.callback({ad: 'ad_complete'});
        break;
        default:
          break;
      }
    }
  });

  return AdPolicy;
  
})(window, $);

