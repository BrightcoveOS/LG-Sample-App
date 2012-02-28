LG.Nav = (function(window, $) {
  const DISPLAY_PLAYLIST_NUM = 5;

  function Nav(element) {
    this.element = element;
    this.length = element.children(":not(.filler)").length;
  }

  $.extend(Nav.prototype, events, {
    constructor: Nav,

    init: function() {
      // figure out what the middle index should be
      this.middle = this.selectedIndex = this.length >= DISPLAY_PLAYLIST_NUM ? 2 : Math.floor(this.length / 2);
      this.updateDisplay( true );
      
      if( this.length < DISPLAY_PLAYLIST_NUM ) {
        for( var i = DISPLAY_PLAYLIST_NUM - this.length; i--; ) {
          $("<div>", {
            "class": "filler"
          })[ i % 2 === 0 ? "appendTo" : "prependTo" ]( this.element );
        }
      }

      // set the width of this element to its computed width,
      // then make it block element for centering. this is
      // necessary to support a dynamic number of playlists.
      this.element.width( this.element.width() ).css("display", "block");
    },

    updateDisplay: function( init, direction, hold ) {
      var items = this.element.children(":not(.filler)");
      var item, classes = [ "active" ];

      if( !init ) {
        item = items.eq( direction === "next" ? 0 : -1 );

        if( direction === "next" ) {
          item.insertAfter(items.last());
        } else {
          item.insertBefore(items.first());
        }

        // short circuit if this updateDisplay call is
        // one of many (holding pattern). 
        if( hold ) {
          return;
        }

        items = this.element.children(":not(.filler)");
      }

      // if there is an item in here that was focused via
      // the keyboard, restore focus to the item
      // when we change it.
      if(items.filter(".focus").length) {
        classes[ classes.length ]= "focus";
      }

      items.removeClass("active focus hover");
      item = items.eq( this.middle ).addClass(classes.join(" "));
      
      // don't focus this thing on initialization
      !init && item.focus();

      this.dispatchEvent("playlistChange", {
        index: this.selectedIndex
      });
    },

    next: function( hold ) {
      if( ++this.selectedIndex >= this.length ) {
        this.selectedIndex = 0;
      }

      this.updateDisplay( false, "next", hold );
    },

    previous: function( hold ) {
      if( this.selectedIndex-- <= 0 ) {
        this.selectedIndex = this.length - 1;
      }

      this.updateDisplay( false, "prev", hold );
    }
  });

  return Nav;
}(window, $));

