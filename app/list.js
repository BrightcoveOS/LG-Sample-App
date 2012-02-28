LG.List = (function(window, $) {
  var items = [],
      container;

  function List(element, playlists) {
    if (typeof element === "string") {
      this.element = $(element);
    } else {
      this.element = element;
    }

    container = element;
    this.playlists = playlists;
    this.selectedIndex = 0;
    this.resetStartIndex();

    // cache re-used elements
    this.listitems = this.element.children();
    this.plists = $('.playlist');
    this.names = $('.name');
    this.descriptions = $('.description');

    // enable events
    $.extend( true, this, events );
  }

  // Returns the currently active row instance
  List.getCurrent = function(){
    return items[ container.children(".active").index() ];
  };

  List.getRowByIndex = function( index ) {
    return items[ index ];
  };

  $.extend(List.prototype, {
    constructor: List,

    // create a new row instance for this playlist
    createRow: function() {
      var row = new LG.Row( this.plists.eq(this.selectedIndex), this.playlists[this.selectedIndex].videos );
      row.addEventListener("indexChanged", $.proxy(this.handleIndexChanged, this));
      row.init();
      items[ this.selectedIndex ] = row;
    },

    handleIndexChanged: function(event, data) {
      this.updateCurrentItem( data.index );
    },

    // when a slide within a row changes, update the
    // name/description for this item
    updateCurrentItem: function( itemIndex ) {
      var selectedIndex = this.selectedIndex,
          item = this.playlists[selectedIndex].videos[itemIndex];

      this.names.eq(selectedIndex).html(item.name);
      this.descriptions.eq(selectedIndex).html(LG.truncate(item.shortDescription));
    },

    updateDisplay: function() {
      var rows = this.listitems;
      
      for (var i = 0, len = rows.length; i < len; i++) {
        var row = rows[ i ];

        // is this row the currently selected row?
        if (i === this.selectedIndex) {
          !items[i] && this.createRow(i); // create the row if it doesn't already exist
          this.selectItem(i);

        // deselect & reset all other rows
        } else {
          this.deselectItem(i);
        }
      }
    },

    getCurrentItem: function() {
      return items[this.selectedIndex];
    },

    setSelectedIndex: function(index) {
      this.selectedIndex = index < 0
        ? this.listitems.length - 1 : index === this.listitems.length
        ? 0 : index;

      this.updateDisplay();
      this.dispatchEvent("indexChanged");
    },

    next: function() {
      this.setSelectedIndex(this.selectedIndex + 1);
    },

    previous: function() {
      this.setSelectedIndex(this.selectedIndex - 1);
    },

    selectItem: function(index) {
      this.listitems.eq(index).show().addClass("active");
      this.plists.eq(index).show();
    },

    deselectItem: function(index) {
      this.listitems.eq(index).hide().removeClass("active");
      this.plists.eq(index).hide();
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

  return List;
}(window, $));
