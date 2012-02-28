LG.Row = (function(window, $) {

  // scale and x-offset of each slide in the row.
  // the "main" key is used on the main & browse
  // screens, and the info key is used for slides
  // within the info screen popup.
  var positions = {
    main: [
      {scale: 1.00, leftX: 391 },
      {scale: 0.85, leftX: 210, rightX: 584 },
      {scale: 0.70, leftX: 50,  rightX: 750 },
      {scale: 0.55, leftX: -105, rightX: 891 }
    ],
    info: [
      {scale: 1.00, leftX: 283 },
      {scale: 0.85, leftX: 99, rightX: 470 },
      {scale: 0.70, leftX: -58,  rightX: 630 },
    ]
  },
  nextIndex;

  function Row(element, videos) {
    this.element = element;

    // If this element is within the info container, use
    // positions from the "info" key. Otherwise, use main.
    this.isInfo = element.closest("#info").length;
    this.positions = positions[ this.isInfo ? "info" : "main" ];
    this.videos = videos || [];
    this.startIndex = this.resetStartIndex();

    $.extend( true, this, events );
  }

  $.extend(Row.prototype, {
    constructor: Row,

    init: function() {
      this.render();
      this.createDisplay();
    },

    render: function(){
      var template = Handlebars.compile( $('#tmplPlaylist').html() );
      var html = template({ videos: this.videos, isInfo: this.isInfo });
      this.element.html( html );
      this.reset();
    },
    
    createDisplay: function() {
      this.reset();
      this.updateDisplay("next", true);
    },

    // returns the row to its default state.
    reset: function(){
      this.children = this.element.children().get();
      this.length = this.children.length;
    },

    updateDisplay: function( movement, init ) {
      var slides = this.children;
      var positions = this.positions;
      var isKeyboardFocused = $(slides).filter(".focus").length;
      var props = {};
      var border = {};
      var selected;
      
      // if this function was not called during init, 
      // alter the slides array based on next/prev movement
      if( init !== true ){
        if( movement === "next" ){
          slides.push( slides.shift() );
        } else {
          slides.splice( 0, 0, slides.pop() );
        }
      }
      
      // loop through each slide, or list item
      for( var x = -1, len = this.length; x++ < len; ){
        var slide = $(slides[x]);
        var offset = Math.abs(Math.floor((len/2) - x));
        var isNegative = x > ( len/2 ) || !offset;
        var position = positions[ offset ];
        var classes = ["active"];
        var posX;

        // if there isn't a defined position for this
        // slide, use offsets that'll position the slide
        // off screen.
        if( !position ) {
          position = { leftX: 10000, rightX: 10000 };
        }

        posX = position[ offset && isNegative ? "rightX" : "leftX" ];

        if( isKeyboardFocused ) {
          classes[ classes.length ] = "focus";
        }

        // If this slide number has a defined position,
        // update the CSS.
        if( position ){
          props["-webkit-transform"] = props["transform"] = "scale(" + position.scale + ")";
          props["left"] = posX + "px";
          props["display"] = "block";
          props["z-index"] = (offset * -1) + this.length;
        }
        
        // apply CSS properties to the slide & border
        slide.css( props );
        slide.find(".border").css("border-width", 7 + offset + (position.scale * offset) );
        slide.toggleClass(classes.join(" "), offset === 0); // give the middle slide the active class

        // set the DOM-order index of this slide to pass
        // to indexChanged, so the proper title/description
        // can be set.
        !offset && (this.selectedIndex = slide.index());

        // move focus to the current slide
        if(offset === 0 && !init) {
          slide.focus();
        }
      }
      
      // dispatch movement as long as this method wasn't
      // called when the row was initialized.
      this.dispatchEvent("indexChanged", {
        index: this.selectedIndex
      });
    },

    // shortcut to this.next or this.previous
    changeRow: function( isNext ) {
      this[ isNext ? "next" : "previous" ]();
    },

    next: function() {
      this.updateDisplay("next");
    },

    previous: function() {
      this.updateDisplay("prev");
    },

    getSelectedSlide: function() {
      return $(this.children).eq( this.selectedIndex - 1 );
    },

    getSelectedIndex: function() {
      return this.selectedIndex;
    },

    getStartIndex: function() {
      return this.startIndex;
    },

    resetStartIndex: function() {
      this.startIndex = null;
    },

    markStartIndex: function() {
      this.startIndex = this.selectedIndex;
    }

  });

  return Row;
}(window, $));
