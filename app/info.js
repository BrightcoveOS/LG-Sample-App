LG.Info = (function(window, $) {
  var instances = [];
  var container, template

  // Private method
  // Hide all created instances
  function hideAll() {
    instances.forEach(function(instance){
      instance.hide();
    });
  }

  // Constructor
  function Info(pVideo) {
    this.pVideo = pVideo;
    this.videos = [];
    this.init();
  }

  // Public class method
  // Return the current open Item instance
  Info.getCurrent = function(){
    return instances.filter(function(instance){
      return instance.element.is(":visible");
    })[ 0 ];
  };

  // Public class method
  // Return the video object for the currently selected video
  Info.getSelectedVideo = function(){
   return this.getCurrent().getSelectedVideo();
  };


  Info.getInstances = function() {
    return instances;
  };

  // Public instance methods
  $.extend(Info.prototype, events, {
    constructor: Info,

    init: function() {

      // cache data when the first instance is created
      if(!instances.length){
        container = $("#info");
        template = Handlebars.compile( $('#tmplInfo').html() );
      }

      this.render();
      instances[ instances.length ] = this;
    },

    getRelatedVideos: function(id) {
      var url = LG.api.api_url + "?" + LG.api.api_playlist_params + "&command=find_related_videos&video_id=" + id + "&page_size=10&token=" + LG.config.token + "&callback=?";
      return $.getJSON(url).then($.proxy(this.handleResponse, this));
    },

    // returns the video object for the currently
    // selected slide within the row
    getSelectedVideo: function() {
      var index = this.element.find(".active").index();
      return this.videos[ index ];
    },

    // Save the videos array as a property of this
    // instance so that the getSelectedVideo()
    // method can return one of its objects.
    handleResponse: function(data){
      this.videos = data.items;
    },

    render: function(){
      this.pVideo.shortDescription = LG.truncate(this.pVideo.shortDescription);
      this.pVideo.recommendedTitle = LG.copy['recommended_title'][LG.config.lang]
      this.element = $(template(this.pVideo)).appendTo(container);
      this.name = this.element.find(".video-name");
      this.getRelatedVideos(this.pVideo.id).then($.proxy(this.renderVideos, this));
      this.show();
    },

    renderVideos: function(data){
      if( data.error ){
        return;
      }
      
      var row = this.row = new LG.Row(this.element.find(".playlist"), data.items);
      row.addEventListener("indexChanged", $.proxy(this.handleIndexChanged, this));
      row.init();
    },

    // when the selected video index changes, update the title div
    handleIndexChanged: function(row){
      var selectedIndex = row.target.selectedIndex;
      var video = this.videos[ selectedIndex ] || null;
      video && this.updateMetaData(video.name);
    },

    updateMetaData: function(name) {
      this.name.html(name);
    },

    show: function(){
      hideAll();
      this.element.show();
    },

    hide: function(){
      this.element.hide();
    },

    changeRow: function( isNext ){
      this[ isNext ? "next" : "previous" ]();
    },

    next: function(){
      this.row.next();
    },

    previous: function(){
      this.row.previous();
    },

    getRow: function( callback ){
      this.getRelatedVideos(this.pVideo.id).then($.proxy(function(){
        callback( this.row, this.videos );
      }, this));
    }

  });

  return Info;
}(window, $));
