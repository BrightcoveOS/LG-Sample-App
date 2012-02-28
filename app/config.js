LG.config = {

    // the language code which is used when localizing copy
    lang: 'en',

    // the application name which is reported in the analytics
    app_name: 'LG Reference App',

    // the google analytics token
    ga_token: '',

    // controls whether the media delivery is progressive or HTTP live streaming
    // 'http_ios' is used for HLS, otherwise use 'http'
    media_delivery: 'http',

    // Brightcove media API token, needs to the read token with URL access
    token: 'Q8xYbanPaui20iXx6ZRthz9455HVGZ3XRXjxG45H16hhZoS0_DD4LA..',

    // the playlists to display in the application
    playlist_ids: ['1160441423001', '1170511151001', '1170511152001', '1170511148001'],

    // enable the continuous play of videos.
    // 'playlist' to play all videos within a playlist, and return to the menu once complete
    // 'all' to continue to the next playlist once all videos in the current playlist have finished.
    // false to disable
    continuous_play: "all",

    // ad server url
    ad_server_url: 'http://shadow01.yumenetworks.com/',

    // turns pre-rolls on or off
    preroll_ads: true,

    // YuMe domain ID
    yume_domain_id: '211jRhjtWMT',

    // YuMe additional query string params
    yume_qs_params: '',

    // YuMe pre-roll playlist URL
    yume_preroll_playlist: 'dynamic_preroll_playlist.json?',

    // interval at which pre-rolls should play
    title_ad_play_interval: 3

};

