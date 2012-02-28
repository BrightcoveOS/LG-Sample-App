// create application namespace
window.LG || (window.LG = {
  api: {
    api_url: 'http://api.brightcove.com/services/library',
    api_playlist_params: 'video_fields=id,name,shortDescription,thumbnailURL,videoStillURL',
    api_params: 'video_fields=id,name,length,shortDescription,thumbnailURL,videoStillURL,renditions,FLVURL'
  },

  // utility fn to truncate a string with an ellipsis
  truncate: function( str, maxChars ) {
    maxChars = maxChars || 175;
    return str.length <= maxChars ?  str : str.substr(0, maxChars).replace(/\s$/, '') + '...';
  },
  
  isNative: /LG Browser/.test(navigator.userAgent)
});

// start closure
(function(window, $) {
  var playlists,
      player,
      video,
      analytics,
      adpolicy,
      list,
      main,
      info,
      nav,
      spinner,
      overlay,
      body,
      playlistsElem,
      navigation,
      controls = {},
      infoWindows = [],
      error,
      errorMessage,
      timeoutId,
      videoProgress = false;

  // maintain state
  var state = (function(){
    var STATES = "info main video browse error";
    var history = [ "main" ];
  
    function change( state ) {
      body.removeClass(STATES);

      if(state && state.length) {
        body.addClass(state);
        history.push(state);
      }
    }

    function restore() {
      var current = history.pop();
      change(history.pop());
    }

    function get( len ) {
      return history[ history.length - ( len || 1 ) ];
    }

    return {
      change: change,
      restore: restore,
      get: get,
      previous: function( num ) {
        return get( num );
      }
    }
  })();

  // application initialization function; fires on document.ready
  function init() {
    var url = LG.api.api_url + "?" + LG.api.api_playlist_params + "&command=find_playlists_by_ids&playlist_ids=" + LG.config.playlist_ids.join(",") + "&token=" + LG.config.token + "&callback=?";
    spinner = $("#spinner");

    // fetch data
    $.ajax(url, {
      dataType: "json",
      success: handlePlaylists,
      error: handlePlaylistsError,
      complete: function() {
        spinner.removeClass("animate").hide();
      },
      beforeSend: function() {
        spinner.addClass("animate").show();
      }
    });

    // cache a bunch of DOM elements & create player-related objects.
    body = $(document.body);
    player = $("#player");
    playlistsElem = $("#playlists");
    navigation= $("#navigation");
    adpolicy = new AdPolicy();
    video = new VideoPlayer($("#bc-video"), adpolicy);
    analytics = new Analytics(video);
    main = $("#main");
    overlay = $("#overlay");
    info = $("#info");
    error = $("#error");
    errorMessage = $("#error-message");
    
    // cache video controls
    controls.main = $("#bc-controls");
    controls.back = $("#bc-back");
    controls.background = $("#bc-controls-background");
    controls.progressHolder = $("#bc-progress-holder");
    controls.playProgress = $("#bc-play-progress");
    controls.loadProgress = $("#bc-load-progress");
    controls.timeControl = $("#bc-time-control");
    controls.playIndicator = $("#bc-play-indicator");
    controls.videoTitle = $("#bc-video-title");
    controls.buttons = $("#bc-buttons");
    controls.playControl = $("#bc-play-control");
    controls.infoControl = $("#bc-info-control");
    controls.rwControl = $("#bc-rw-control");
    controls.ffControl = $("#bc-ff-control");
    controls.browseControl = $("#bc-browse-control");
    controls.qmenuControl = $("#bc-qmenu-control");

    // update any localized copy
    controls.playIndicator.html(LG.copy['now_playing'][LG.config.lang]);
    controls.browseControl.html(LG.copy['browse_button'][LG.config.lang]);
    controls.qmenuControl.html(LG.copy['q_menu_button'][LG.config.lang]);
    
    // video object listeners
    video.addEventListener("progress", handleProgress);
    video.addEventListener("complete", handleComplete);
    video.addEventListener("fastForward", handleFastForward);
    video.addEventListener("rewind", handleRewind);
    video.addEventListener("error", handleError);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("beforeload", handleBeforeLoad);
    video.addEventListener("load", handleLoad);
    video.addEventListener("adStart", handleAdStart);
    video.addEventListener("adComplete", handleAdComplete);

    // preload images that won't appear immediately
    $("<img />")
      .attr("src", "images/close-hover.png")
      .attr("src", "images/back-hover.png")
      .attr("src", "images/arrow-right-hover.png")
      .attr("src", "images/arrow-left-hover.png")
      .attr("src", "images/arrow-up-hover.png")
      .attr("src", "images/arrow-down-hover.png")
      .attr("src", "images/button-right-hover.png")
      .attr("src", "images/button-left-hover.png")
      .attr("src", "images/tab-active-background.png")
      .attr("src", "images/tab-active-background-active.png")
      .attr("src", "images/tab-active-background-right-active.png")
      .attr("src", "images/tab-active-background-left-active.png")
      .attr("src", "images/tab-inactive-hover.png")
      .attr("src", "images/play.png")
      .attr("src", "images/controls-browse-hover.png")
      .attr("src", "images/controls-info-hover.png")
      .attr("src", "images/controls-pause-hover.png")
      .attr("src", "images/controls-play-hover.png")
      .attr("src", "images/controls-qmenu-hover.png")
      .attr("src", "images/controls-ff-hover.png")
      .attr("src", "images/controls-rw-hover.png");
  }
  
  // displays an error message within a popup
  function displayError(message) {
    errorMessage.html(message);
    error.show();
    state.change("error");
  }

  // closes the error popup
  function hideError() {
    error.hide();
  }

  // toggles the info popup
  function toggleInfo(display) {
    var popup = info[ 0 ];
    var isVisible = popup.style.display === "block";

    // return early if the info window is already in
    // the state we want it to be in.
    if(display != null && (isVisible === display)) {
      return;
    }

    // if display wasn't passed it, set it to the opposite of the current state
    if(display == null) {
      display = !isVisible;
    }

    popup.style.display = display ? "block" : "none";

    if(display) {
      hideNavOverVideo();
      hideControls();
      state.change("info");
      focusActiveSlide();
      controls.infoControl.removeClass("focus");
    } else {
      state.change("video");
      displayControls(true);
      $(":focus").blur();
    }
  }

  // handles the Brightcove JSON data returned from AJAX
  function handlePlaylists(data) {
    // detect any error messages from BC
    if (!data || (data && data.error)) {
      displayError(LG.copy["playlist_error"][LG.config.lang]);
    } else if (data && data.items) {
      playlists = data.items;
      buildApplication();
    }
  }
  
  function handlePlaylistsError(data) {
    displayError(LG.copy["playlist_error"][LG.config.lang]);
  }
  
  function buildApplication() {
    var template;
    var context = { playlists: playlists };

    // render the main navigation
    template = Handlebars.compile($("#tmplNavigation").html());
    navigation.html(template(context));

    // render the playlists
    template = Handlebars.compile($("#tmplPlaylists").html());
    playlistsElem.append(template(context));
    playlistsElem.removeClass("invisible"); // avoids a FOUC

    // create a new playlist object
    list = new LG.List(playlistsElem.find("ul"), playlists);

    // create a new navigation instance. once the event listener
    // is bound, fire its init method.
    nav = new LG.Nav(navigation);
    nav.addEventListener("playlistChange", function(event, data){
      list.setSelectedIndex( data.index );
    });

    // kick off the nav
    nav.init();

    // rewind button
    controls.rwControl.bind("click", function(event) {
      event.stopPropagation();
      clearTimeout(timeoutId);
      video.rewind();
    });

    // fast forward button
    controls.ffControl.bind("click", function(event) {
      event.stopPropagation();
      clearTimeout(timeoutId);
      video.fastForward();
    });

    // play button
    controls.playControl.bind("click", function(event) {
      event.stopPropagation();
      clearTimeout(timeoutId);
      controls.playControl.toggleClass("pause", !controls.playControl.hasClass("pause"));
      video[ video.isPlaying() ? "pause" : "play" ]();
    });

    // info button
    controls.infoControl.bind("click", function(event) {
      event.stopPropagation();
      toggleInfo(true);
    });

    // browse button
    controls.browseControl.bind("click", function(event) {
      controls.browseControl.removeClass("focus");
      event.stopPropagation();
      toggleInfo(false);
      showNavOverVideo();
    });

    // q menu button
    controls.qmenuControl.bind("click", function(event) {
      controls.qmenuControl.removeClass("focus");
      event.stopPropagation();
      LG.isNative && window.NetCastLaunchQMENU();
    });

    // Toggle the "hover" class on the mini controls manually. Otherwise,
    // when you hover & click on the mini controls to hide the browse menu,
    // and then re-open the browse menu, the hover state remains on the controls
    // for a split second until the device has a chance to reflow.
    controls.main.bind("mouseenter mouseleave", function(event) {
      if(!$(this).hasClass("mini")) {
        return;
      }

      $(this).toggleClass("hover", event.type === "mouseenter");
    });

    // bind key/mouse events
    $(window)
      .keydown(handleKeydown);

    // handle all back/close buttons
    body
      .delegate(".back", "click", handleBackButton)
      .delegate(".close", "click", handleClose);

    // clicking on the mini-controls to close
    controls.main
      .bind("click", function(event){
        handleControlsClick(this);

        // prevent this click from reachig the player.
        // if it does, the controls will display again
        // even though they should be hidden if a video
        // is playing.
        event.stopImmediatePropagation();
      })
      .bind("keydown", function( event ){
        if( event.which === 13 ) {
          handleControlsClick(this);
          event.stopImmediatePropagation();
        }
      });

    // toggle controls when clicking on the player.
    // enter functionality is within handleEnter()
    player.bind("click", function( event ){
        toggleControls(true);
      });

    // move between videos within a playlist
    $("#left, #right")
      .bind("click", cycleSlide);

    // Playlist carousel event handlers on main screen & info screen
    // Delegation here is on the body because some .playlist elements
    // are dynamically built.
    body
      .delegate(".playlist .item.active", "click", handleEnter)
      .delegate(".playlist .item:not(.active)", "click", chooseSlide)
      .delegate(".playlist", "mousemove", function(){
        navigation.find(".active").removeClass("focus");
      })
      .delegate(".playlist", "keydown", function( event ){
        event.which === 13 && handleEnter(event);

        // right/left arrows?
        if(event.which === 39 || event.which === 37) {
          cycleSlide(event);
          
          // stop the handler bound to window from firing
          event.stopImmediatePropagation();
        }
      });
    
    // Navigation event handlers
    navigation
      .delegate(".navigation-right, .navigation-left", "click", cyclePlaylists)
      .delegate(".navigation-container:not(.active)", "mouseenter mouseleave", function(event){
        $(this)[ event.type === "mouseenter" ? "addClass" : "removeClass" ]("hover");
      })
      .delegate(".navigation-container:not(.active)", "click", choosePlaylist)
      .bind("keydown", function( event ){
        if(event.which === 39 || event.which === 37 ) {
          cyclePlaylists(event);
          
          // stop the handler bound to window from firing
          event.stopImmediatePropagation();
        }
      });

    // reset the controls timeout when a button is hovered over
    controls.buttons.bind("mouseover", function(){
      clearTimeout(timeoutId);
      hideControlsTimeout();
    });

    // finally, give focus to the videos on page load.
    focusActiveSlide();
  }

  /*
   * Video class event handlers
   */

  function handleComplete(event) {
    if(video.seekState != null ) {
      return;
    }

    $(".focus").removeClass("focus");

    // close info window if it's still visible
    if( info.is(":visible") ) {
      toggleInfo( false );
    }
    
    // close error if it's still visible
    if( error.is(":visible") ) {
      hideError();
    }

    // if continuous play is enabled, load/play the next video
    if(LG.config.continuous_play && queueNext()) {
      return;
    }

    // reset start indexes
    list.resetStartIndex();
    LG.List.getCurrent().resetStartIndex();

    hidePlayer();
    
    state.change("main");
  }
  
  function handleProgress(event) {
    if( !videoProgress ) {
      displayControls(true);
      videoProgress = true;
      spinner.hide();
      spinner.removeClass("animate");
    }

    updateVideoControls();
  }

  function handleRewind(event) {
    if(event.position === 0){
      video.stop();
      updateVideoControls();
    }
  }

  function handleFastForward(event) {
    if(event.position === 0) {
      video.stop();
      updateVideoControls();
    }
  }

  function handleError(event, data) {
    var currState = state.get();

    if( currState === "video" && state.previous(3) === "info" ) {
      toggleInfo(true);
      video.play();
    } else {
      hidePlayer();
    }

    displayError(LG.copy['video_error'][LG.config.lang]);
  }
  
  function handlePlay(event) {
    controls.playControl.addClass("pause");
  }
  
  function handlePause(event) {
    controls.playControl.removeClass("pause");
  }
  
  function handleBeforeLoad(event) {
    spinner.addClass("animate");
    spinner.show();
  }
  
  function handleLoad(event, video) {
    var popup = infoWindows[ video.id ];

    updateVideoControls();
    controls.videoTitle.html(video.name);

    if(popup) {
      popup.show();
    } else {
      infoWindows[ video.id ] = new LG.Info( video );
    }
  }
  
  function handleAdStart(event) {
    controls.videoTitle.html(LG.copy["sponsor_message"][LG.config.lang]);
    controls.infoControl.hide();
    controls.browseControl.hide();
    controls.rwControl.hide();
    controls.ffControl.hide();
    controls.playControl.addClass("pause");
  }
  
  function handleAdComplete(event) {
    controls.videoTitle.html(video.getCurrentVideo().name);
    controls.infoControl.show();
    controls.browseControl.show();
    controls.rwControl.show();
    controls.ffControl.show();
    videoProgress = false;
  }

  /*
   * video player functions
   */

  function updateVideoControls() {
    var position = video.getVideoPosition();
    var duration = video.getVideoDuration();
    var percent = Math.min(position/duration, 1);
    var width = Math.round(controls.progressHolder.width() * percent);
    controls.playProgress.width(width);
    controls.timeControl.html(convertTime(position) + " / " + convertTime(duration));
  }
  
  function playSelectedVideo( event ) {
    var Info = LG.Info;
    var vid, row;

    if(state.get() === "info") {
      Info.getCurrent().getRow(function( row, videos ){
        Info.currentPlaylistRow = row;
        Info.currentPlaylistVideos = videos;

        if(row.getStartIndex() == null) {
          // console.log( 'marking row start', row.selectedIndex );
          row.markStartIndex();
        }
      });

      vid = Info.getSelectedVideo();
    } else {

      if(video.isInfoVideo) {
        vid = Info.currentPlaylistVideos[ Info.currentPlaylistRow.selectedIndex ];
      } else {
        row = list.getCurrentItem();
        vid = playlists[list.selectedIndex].videos[row.selectedIndex];

        if((event && ~["click", "keydown"].indexOf(event.type)) || row.getStartIndex() == null) {
          // console.log( 'marking row start', row.selectedIndex, "list index is", list.selectedIndex );
          row.markStartIndex();
        }
      }
    }

    playVideo(vid);
  }

  function queueNext() {
    function process( row ) {
      var index = row.getSelectedIndex();

      if( index + 1 !== row.getStartIndex()) {
        row.next();
      } else {
        // bail if at the end of the playlist and config
        // is not set to all, or the last video from the info
        // playlist played.
        if(LG.config.continuous_play === "playlist" || video.isInfoVideo) {
          return false;

        // otherwise, spoof the user clicking on the next playlist
        // to move to the next playlist.
        } else if(LG.config.continuous_play === "all" ) {
          if(list.getSelectedIndex() + 1 !== list.getStartIndex()) {
            navigation.trigger($.Event("keydown", {
              which: 39
            }));

          // if all playlists have played, bail.
          } else {
            return false;
          }
        }
      }

      playSelectedVideo();
      return true;
    }

    return process(
      video.isInfoVideo ?
        LG.Info.currentPlaylistRow :
        LG.List.getCurrent()
    );
  }
  
  function playVideo(pVideo) {
    // short circuit if there's already a video playing, and that video
    // is the same video the user is attempting to play.
    if (video.getCurrentVideo() && video.getCurrentVideo() !== undefined && video.isPlaying() && pVideo.id === video.getCurrentVideo().id) {
      return;
    }
    
    videoProgress = false;
    controls.main.hide();
    controls.playProgress.width(0);
    controls.timeControl.html("00:00 / 00:00");
    hideNavOverVideo();
    hideControls();
    controls.back.hide();
    player.show();
    state.change("video");
    video.loadVideo(pVideo.id);
  }
  
  function hidePlayer() {
    player.hide();
    hideControls();
    overlay.hide();
    main.show();
    focusActiveSlide();
  }
  
  // displays the browse screen over top of a playing video
  function showNavOverVideo() {
    state.change("browse");
    overlay.show();
    main.show();
    controls.main.addClass("mini");
    controls.main.show();
    controls.background.hide();
    controls.back.hide();
    updateVideoControls();
    displayControls(false);
    focusActiveSlide();
  }
  
  // hides the browse screen
  function hideNavOverVideo() {
    overlay.hide();
    main.hide();
    controls.main.removeClass("mini");
    controls.back.show();
    controls.background.show();
    updateVideoControls();
    displayControls(true);
    $(":focus").blur();
  }
  
  function toggleControls( fadeout ) {
    var currState = state.get();

    if( currState === "video" ) {
      clearTimeout(timeoutId);

      if( controls.main.is(":visible") ) {
        hideControls();
      } else {
        displayControls( fadeout );
      }
    }
  }

  function play() {
    video.play();
    controls.playControl.addClass("pause");
    displayControls(true);
  }
  
  function pause() {
    displayControls();
    video.pause();
    controls.playControl.removeClass("pause");
  }
  
  function displayControls(hideAfterDelay) {
    clearTimeout(timeoutId);

    if(state.get() === "video") {
      controls.main.show();
      controls.back.show();
      controls.background.show();

      if (hideAfterDelay) {
        hideControlsTimeout();
      }
    }
  }

  function hideControlsTimeout(){
    timeoutId = setTimeout(function(){
      hideControls();
      LG.isNative && window.NetCastMouseOff(0);
    }, 8000);
  }

  function hideControls() {
    clearTimeout(timeoutId);
    controls.background.hide();
    controls.main.hide();
    controls.back.hide();
  }

  // Handles moving up/down/left/right between rows & list
  // instances, for both the main container and info window.
  function cycleSlide( event ){
    var id = event.target.id;
    var target = $(event.target);
    var self = $(this);
    var movePrev, current;

    // moving left/right?
    if( id === "left" || id === "right" || event.which === 39 || event.which === 37 ) {
      var isRight = event.which === 39 || id === "right";

      // get the current List or Info object instance
      // depending on what is currently visible
      current = LG[ info.is(":visible") ? "Info" : "List" ].getCurrent();
      current && current.changeRow( isRight );
      return;

    // handle click on the title next to the icon.
    } else if( target.is(".title") ) {
      var li = target.closest("li");
      movePrev = target.hasClass("position-above") || li.index() < li.siblings(".active").index() && !target.hasClass("position-below");
    }

    movePrev !== undefined && list[ movePrev ? "previous" : "next" ]();
  }
  
  // move between playlists
  function cyclePlaylists( event ) {
    var isRight = $(event.target.parentNode).hasClass("navigation-right") || event.which === 39;
    nav[ isRight ? "next" : "previous" ]();

    if( event.type === "click" ) {
      focusActiveSlide();
    }
  }

  // choose a specific playlist
  function choosePlaylist( event ) {
    var selected = $(this);
    var index = selected.index();
    var offset = index - selected.siblings(".active").index();

    for(var i = Math.abs(offset); i--; ) {
      nav[ offset < 0 ? "previous" : "next" ]( i !== 0 );
    }

    focusActiveSlide();
  }

  // choose a specific playlist
  function chooseSlide( event ) {
    var selected = $(this);
    var index = selected.index();
    var offset = index - selected.siblings(".active").index();

    for(var i = Math.abs(offset); i--; ) {
      var row = LG[ state.get() === "info" ? "Info" : "List" ].getCurrent();
      row[ offset < 0 ? "previous" : "next" ]( i !== 0 );
    }
  }

  // focuses the active slide in either the main carousel
  // or in the info window carousel.
  function focusActiveSlide() {
    var root = state.get() === "info" ? info : playlistsElem;
    root.find(".item.active").focus().addClass("focus");
  }

  /*
   * keyboard/mouse event listenrs
   */

  // called when pressing the enter key or clicking on the
  // active slide to play a video.
  function handleEnter( event ) {
    var currState = state.get();
    var target = $(event.target);
    var isVideoTarget;

    // toggle the controls on/off in video state,
    // assuming the target isn't anything specific
    // like a button.
    if( currState === "video" && target.is(document.body) ){
      toggleControls(true);
      return;
    }

    // determine whether this event should launch a new video
    isVideoTarget = (target.is(".item") || target.closest(".item").length);

    // figure out which state we're in, and play
    // the selected video.
    if({ "browse":1, "main":1, "info":1 }[ currState ] && isVideoTarget ) {
      video.isPlaying() && video.stop();
      video.isInfoVideo = currState === "info";
      playSelectedVideo( event );
      currState === "info" && toggleInfo(false);
      currState !== "info" && list.markStartIndex();
      // currState !== "info" && console.log( 'marking list start index', list.selectedIndex );
    }
  }

  function handleControlsClick( target ) {
    if(!$(target).hasClass("mini")) {
      return;
    }
    
    $(target).removeClass("hover");
    state.change("video");
    hideNavOverVideo();
  }

  // handles click on the close button
  function handleClose(event) {
    LG.isNative && window.NetCastBack();
  }

  // handles all back buttons
  function handleBackButton(event) {
    var currState = state.get();
    
    switch( state.get() ) {
      case "info":
        toggleInfo(false);
        break;
      case "browse":
        state.change("video");
        hideNavOverVideo();
        break;
      case "video":
        if(video.isAdPlaying()) {
          video.clearAd(); // clear the setting of current playing ad.
          video.handleComplete();
        }

        // console.log( 'resetting start index'  );
        list.resetStartIndex();
        LG.List.getCurrent().resetStartIndex();

        video.stop();
        LG.Info.getCurrent() && LG.Info.getCurrent().hide();
        hidePlayer();
        state.change("main");
        break;
      case "error":
        hideError();
        state.restore();
        focusActiveSlide();
        break;
    }
  }

  function handleKeyMovement( key ) {
    var buttons = $("[tabindex]:visible");
    var focused = buttons.filter(":focus");
    var keys = { 37: "left", 38: "up", 39: "right", 40: "down" };
    var key = keys[ event.which ];
    var currState = state.get();
    var next;

    // error windows must be closed first.
    if( currState === "error" ) {
      $("#error-back").focus().addClass("focus");
      return;
    }

    // don't hide controls on the user if they're navigating
    clearTimeout(timeoutId);

    if( currState === "video" ) {
      timeoutId = setTimeout(function(){
        hideControls();
        $(".focus").removeClass("focus").blur();
        LG.isNative && window.NetCastMouseOff(0);
      }, 5000);
    }

    $(".focus").removeClass("focus");

    // this function may return an empty jquery object
    function horizontal() {
      var row = focused.data("tab-row");
      var tabindex = parseInt( focused.attr("tabindex"), 10 );
      var btnindex, button;

      // we only care about buttons in this row
      var btns = buttons.filter(function() {
        return $(this).data("tab-row") == row;
      });

      tabindex = tabindex + (key === "left" ? -1 : 1);
      button = btns.filter('[tabindex="'+tabindex+'"]');
      btnindex = btns.index( button );

      // if a button wasn't found, reset the button
      // based on the key pressed, and reset btnindex to
      // allow looping.
      //
      // this state can occur when buttons are hidden while
      // an ad is playing because the tabindex of the visible
      // buttons are not in order.
      if( !button.length && btns.length > 1 ) {
        btnindex === -1;

        button = btns[ key === "right" ? "last" : "first" ]();
        
        if( button[0] !== focused[0] ) {
          btnindex = btns.index( button );
        }
      }

      // allow looping
      if( key === "right" && btnindex === -1 ) {
        button = btns.first();
      } else if( key === "left" & tabindex <= 1 ) {
        button = btns.last();
      }
      
      return button;
    }

    function vertical() {
      var next, row, btns, main;

      // determine the row we need to be on
      row = focused.data("tab-row");
      row === undefined && (row = 0);
      row += ( key === "up" ? -1 : 1 );

      var numRows = (function(){
        var numbers = buttons.map(function(){
          return $(this).data("tab-row");
        }).get();
        
        var ret = [], len = numbers.length;

        // now make that array unique
        while ( len-- ) {
          if( ret.indexOf(numbers[len]) === -1 ) {
            ret[ ret.length ] = numbers[len];
          }
        }

        return ret.length;
      })();

      // shift row for looping
      if( key === "up" && row <= 0 ) {
        row = numRows;
      } else if( key === "down" && row === numRows + 1 ) { 
        row = 1;
      }

      // grab all the buttons within this row
      btns = buttons.filter(function(){
        return $(this).data("tab-row") === row;
      });

      // if there is a "main" focusable element in this
      // row return that, otherwise just return the first one.
      main = btns.filter(function(){
        return $(this).data("tab-main") == true;
      });

      return main.length ? main : btns.first();
    }

    // now, figure out to do based on the current state
    if(currState === "main" || currState === "browse") {

      // filter all the possible buttons to the ones we actually care about
      buttons = buttons.filter(function( i, elem ){
        elem = $(elem);
        var isActiveNav = elem.closest(".navigation-container").andSelf().hasClass("active");
        var isActivePlaylist = elem.is(".item.active");
        return isActiveNav || isActivePlaylist || elem.is("#close, #browse-back");
      });

      if(currState === "browse") {
        buttons = buttons.add(controls.main);
      }

    // don't include the controls container in the video state
    } else if(currState === "video") {
      buttons = buttons.not(controls.main);
    }

    if( ~["right", "left"].indexOf(key) ) {
      next = horizontal();
    } else if( ~["up", "down"].indexOf(key) ) {
      next = vertical();
    }

    next.addClass("focus").focus();
  }

  // handles all keydown events
  function handleKeydown(event) {
    var currState = state.get();

    switch (event.keyCode) {
      case 38: // up
      case 40: //down
        if( currState === "video" ) {
          displayControls();
        }

        handleKeyMovement( event.which );
        break;
      case 37: // left
      case 39: // right
        if( currState === "video" ) {
          displayControls();
        }

        handleKeyMovement( event.which );
        break;
      case 66: // b
      case 83: // s
      case 461: // back
      case 413: // stop
        var currState = state.get();

        if(currState === "info") {
          toggleInfo(false);
        } else if (currState === "browse") {
          hideNavOverVideo();
          state.change("video");
        } else if (currState === "video") {
          if(video.isAdPlaying()) {
            video.clearAd(); // clear the setting of current playing ad.
            video.handleComplete();
          }

          // reset the start indexes
          // console.log( 'resetting start indexes'  );
          list.resetStartIndex();
          LG.List.getCurrent().resetStartIndex();

          video.stop();
          LG.Info.getCurrent() && LG.Info.getCurrent().hide();
          hidePlayer();
          state.change("main");
        } else if(currState === "main") {
          LG.isNative && window.NetCastBack();
        } else if(currState === "error" ) {
          handleBackButton();
        }
        break;
      case 13: // enter
        handleEnter(event);
        break;
      case 412: // rewind
        if (video.isAdPlaying()) return;
        video.rewind();
        break;
      case 417: //fast forward
        if (video.isAdPlaying()) return; 
        video.fastForward();
        break;
      case 80: // p
        if (video.isAdPlaying()) return;
        if (video.isPlaying()) {
          pause();
        } else {
          play();
        }
        break;
      case 79: // o
        clearTimeout(timeoutId);

        if( state.get() !== "video" ) {
          return;
        }

        if( controls.main.is(":visible") ) {
          hideControls();
        } else {
          displayControls();
        }
        break;
      case 415: // play
        play();
        break;
      case 19: // pause
        pause();
        break;
      case 73: // i
      case 457: // info
        if (video.isAdPlaying()) return;

        if (player.is(":visible")) {
          toggleInfo();
        }
        break;
    }
  }

  /*
   * utility functions
   */
  
  // converts seconds to hh:mm:ss format
  function convertTime(sec) {
    var min = Math.floor(sec/60);
    sec = sec % 60;
    
    var hr = Math.floor(min/60);
    min = min % 60;
    
    var time = [];
    if (hr !== 0) {
      time.push(formatTime(hr));
    }
    time.push(formatTime(min));
    time.push(formatTime(sec));
    
    return time.join(":");
  }
  
  // formats 0-9 as double digits. e.g., "09" instead of "9".
  function formatTime(time) {
    if (time > 9) {
      return time;
    } else {
      return "0" + time;
    }
  }

  /*
   * initialization
   */
  $(document).ready(init);

})(window, $);

// listen for key presses to the red and green buttons
$(window).keydown(handleDebugKeydown);

function handleDebugKeydown(event) {
  switch (event.keyCode) {
    case 404: // green
      window.location.reload();
      break;
  }
}
