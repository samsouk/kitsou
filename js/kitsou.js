// .bind shim for IE8
if (!Function.prototype.bind) {
  Function.prototype.bind = function(context) {
    var self = this;
    return function() {
      return self.apply(context, arguments);
    };
  };
}

// Converts degrees to radians.
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};


(function() {

  "use strict";

  var Timer = Stapes.subclass({
    "constructor" : function(interval) {
      this.interval = interval;
      this.started = false;
    },

    start : function() {
      this.started = true;
      setInterval(function() {
        this.emit('tick');
      }.bind(this), this.interval);
    }
  });


  var AppKitsou = Stapes.subclass({

    constructor : function() {
      var self = this;

			this.window_width = 1280;
			this.window_height = 800;
			this.supports_video = !!document.createElement('video').canPlayType;
			this.can_play_mp4 = false;
			this.can_play_ogg = false;
			this.can_play_webm = false;

			this.stage = document.getElementById('stage');
			this.virtpad = $('.virtpad');
			this.pep = $('.virtpad.constrain-to-parent .pep');

			this.rate_min = 1/2;
			this.rate_max = 2;
			this.rate_incr =.015;
			this.angle_speed_min = -1;
			this.angle_speed_max = 1;
			this.angle_speed_incr = .01;

			this.v = null;
			this.c = null;
			this.comments = [];

			this.current_video_index = 0;
			this.initZoom();
			this.initRotate();


      this.prop = null;

      var json_url = 'json/videos.json';
      $.getJSON( json_url, { } )
        .done(function(data) {
          self.videos = data;

          self.first_video_index = 0;
          self.last_video_index = self.videos.length - 1;

          self.initTransform();
          self.initVirtpad();

          if (self.supports_video) {
            self.initVideo();
            self.initComments();

            self.timer = new Timer( 1000 / 25 );
            self.bindEventHandlers();
            self.timer.start();
          }
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ", " + error;
        });

    },

    "el" : $("body").get(0),

    "bindEventHandlers" : function() {
      var self = this;

      this.timer.on('tick', function() {
        this.rotate += this.angle_speed;
        this.rotate %= 360;

        var test = this.calculateLargestProportionalRect(Math.radians(this.rotate), this.window_width, this.window_height);
        this.zoom = this.window_width/test.w;
        this.v.style[this.prop]='scale('+this.zoom+') rotate('+this.rotate+'deg)';

      }, this);

      $(window).resize(function() {

        self.window_width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
        self.window_height = (window.innerHeight > 0) ? window.innerHeight : screen.height;

        self.commentsInitPosition();
      });


      // Key handler.
      $( "body" ).keydown(function( event ) {
        if (false) {
          //
        }
        // Spacebar.
        else if ( event.which == 32 ) {
          /*
          if (self.v.paused){
            self.v.play();
          } else {
            self.v.pause();
          }
          */
          if (self.c.paused){
            self.c.play();
          } else {
            self.c.pause();
          }
        }
        // Right. (next video)
        else if (event.which == 39) {
          var next_video = self.getNextVideoIndex();

          if (next_video > 0) {
            self.hideComments(function() {
              self.switchVideo(next_video);
              self.initComments();
              self.showComments();
              self.virtpadReset();
            });
          }
        }
        // Left. (previous video)
        else if (event.which == 37) {
          var next_video = self.getPreviousVideoIndex();

          if (next_video < self.last_video_index)
            self.hideComments(function() {
              self.switchVideo(next_video);
              self.initComments();
              self.showComments();
              self.virtpadReset();
            });
        }
        // Down.
        else if (event.which == 40) {
          var rate = self.v.playbackRate - self.rate_incr;
          if (rate < self.rate_min) {
            rate = self.rate_min;
          }
          self.v.playbackRate = rate;
        }
        // Up.
        else if (event.which == 38) {
          var rate = v.playbackRate + self.rate_incr;
          if (rate > self.rate_max) {
            rate = self.rate_max;
          }

          self.v.playbackRate = rate;
        }
        // W
        else if (event.which == 87) {
          var speed = self.angle_speed + self.angle_speed_incr;
          if (speed > self.angle_speed_max) {
            speed = self.angle_speed_max;
          }
          self.angle_speed = speed;
        }
        // Q
        else if (event.which == 81) {
          var speed = self.angle_speed - self.angle_speed_incr;
          if (speed < self.angle_speed_min) {
            speed = self.angle_speed_min;
          }
          self.angle_speed = speed;
        }
        // S
        else if (event.which == 83) {
          var inc = self.zoom_increment + .0005;
          if (inc > .02) {
            inc = .02;
          }
          self.zoom_increment = inc;
        }
        // X
        else if (event.which == 88) {
          var inc = self.zoom_increment - .0005;
          if (inc < -0.02) {
            inc = -0.02;
          }
          self.zoom_increment = inc;
        }
        // Esc
        else if (event.which == 27) {
        }
        // Enter
        else if (event.which == 13) {
          self.toggleFullScreen();
        }

        //
        event.preventDefault();
      });


      // Click handler.
      $(document).on('click',".btn-next",function (e) {
        $(e.target).removeClass("shake");
        $(e.target).removeClass("floating");

        var next_video = self.getNextVideoIndex();
        self.hideComments(function() {
          self.switchVideo(next_video);
          self.initComments();
          self.showComments();
          self.virtpadReset();
        });
      });

      $(document).on('click',".btn-prev",function (e) {
        $(e.target).removeClass("shake");
        $(e.target).removeClass("floating");

        var next_video = self.getPreviousVideoIndex();
        self.hideComments(function() {
          self.switchVideo(next_video);
          self.initComments();
          self.showComments();
          self.virtpadReset();
        });
      });

      $(document).on('click',".btn-intro",function (e) {
        var comment = document.getElementById(self.getCommentId(0));
        $('#intro-text').hide();
        self.v.pause();
        $(comment).removeClass("shake");
        $(comment).removeClass("floating");
        self.showComments();
        self.clickCommentCallback({target: comment});
      });

      $(document).on('click',".btn-skip",function (e) {
        $(e.target).removeClass("shake");
        $(e.target).removeClass("floating");

        var next_video = self.getNextVideoIndex();
        $('#intro-text').hide();
        self.switchVideo(next_video);
        self.initComments();
        self.showComments();
        $('.virtpad').show();
        $('.pep').show();
      });

      $(document).on('click',".virtpad .center-point",function (e) {
        self.virtpadReset();
      });

      /*
      $('.btn0').hover(
        function() {
          $(this).css('-webkit-animation-delay', '0s');
          $(this).css('-moz-animation-delay', '0s');
          $(this).removeClass("floating");
          $(this).addClass("shake");
        },
        function() {
          $(this).removeClass("shake");
          $(this).addClass("floating");
        }
      );
      */

    },


    "getNextVideoIndex": function () {
      var ret = this.current_video_index + 1;
      if (ret > this.last_video_index) {
        ret = this.first_video_index;
      }
      return ret;
    },
    "getNextVideoTitle": function () {
      var i = this.getNextVideoIndex();
      return this.videos[i].title;
    },
    "getPreviousVideoIndex": function () {
      var ret = this.current_video_index - 1;
      if (ret < 0) {
        ret = this.last_video_index;
      }
      return ret;
    },
    "getPreviousVideoTitle": function () {
      var i = this.getPreviousVideoIndex();
      return this.videos[i].title;
    },
    "getCurrentVideoId": function () {
      return this.videos[this.current_video_index].id;
    },
    "getCurrentVideoTitle": function () {
      return this.videos[this.current_video_index].title;
    },

    "initTransform": function () {
      /* Array of possible browser specific settings for transformation */
      var properties = ['transform', 'WebkitTransform', 'MozTransform',
          'msTransform', 'OTransform'];

      var i, j;

      /* Find out which CSS transform the browser supports */
      for (i=0, j=properties.length; i<j; i++){
        if (typeof stage.style[properties[i]] !== 'undefined'){
          this.prop = properties[i];
          break;
        }
      }
    },
    
    "initZoom": function() {
      this.zoom = 1;
			this.zoom_increment = 1;
    },
    
    "initRotate": function() {
			this.rotate = 0;
			this.angle_speed = 0;
    },

    "initVirtpad": function () {

      self = this;

      this.pep.pep({
        useCSSTranslation: true,
        constrainTo: 'parent',
        cssEaseDuration: 1000,
        multiplier: 1,
        velocityMultiplier: 1,
        drag: function(ev, obj){
          var stat = self.pepStat();
          self.angle_speed = stat.rotate;
          self.v.playbackRate = stat.rate;
        },
        ret: function(ev, obj){
          var stat = self.pepStat();
          self.angle_speed = stat.rotate;
          self.v.playbackRate = stat.rate;
        }
      });
    },


    "initVideo": function () {

      this.window_width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
      this.window_height = (window.innerHeight > 0) ? window.innerHeight : screen.height;

      this.v = document.createElement('video');
      this.can_play_mp4 = this.v.canPlayType('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');
      this.can_play_ogg = this.v.canPlayType('video/ogg; codecs="theora,vorbis"');
      this.can_play_webm = this.v.canPlayType('video/webm; codecs="vp8,vorbis"');

      this.v.id = "video";

      this.v.setAttribute('autoplay', 'true');
      this.v.setAttribute('loop', 'true');
      this.v.setAttribute('preload', 'true');

      if (this.can_play_mp4 && this.videos[0].mp4) {
        var source = document.createElement('source');
        source.id = 'mp4';
        source.src = this.videos[0].mp4;
        this.v.appendChild(source);
      }
      if (this.can_play_webm && this.videos[0].webm) {
        var source = document.createElement('source');
        source.id = 'webm';
        source.src = this.videos[0].webm;
        this.v.appendChild(source);
      }
      if (this.can_play_ogg && this.videos[0].ogg) {
        var source = document.createElement('source');
        source.id = 'ogg';
        source.src = this.videos[0].ogg;
        this.v.appendChild(source);
      }

      this.stage.appendChild(this.v);
      this.current_video_index = 0;

      /* Position video */
      this.v.style.left = 0;
      this.v.style.top = 0;

      if (this.getCurrentVideoId() == 'intro') {
        $('.btn').hide();
        $('.btn-cur').hide();
        $('.btn-prev').hide();
        $('.btn-next').hide();
        $('.virtpad').hide();
        $('.pep').hide();
        
        this.first_video_index = 1;
        this.showIntro();
      }
      else {
        $('.btn-cur').text(this.getCurrentVideoTitle());
        $('.btn-next').text(this.getNextVideoTitle());
        $('.btn-prev').hide();
        $('.btn-next').show();
        $('.btn-cur').show();

        $('.virtpad').show();
        $('.pep').show();

        $('.btn').hover(
          function() {
            $(this).css('-webkit-animation-delay', '0s');
            $(this).css('-moz-animation-delay', '0s');
            $(this).removeClass("floating");
            $(this).addClass("shake");
          },
          function() {
            $(this).removeClass("shake");
            $(this).addClass("floating");
          }
        );
      }

      this.v.addEventListener('loadstart', function(e) {
        this.videoPaused = true;
        e.preventDefault();
      });

    },

    "showIntro": function () {
      self = this;

      var $intro_text = $('#intro-text');
      $intro_text.hide();
      //$intro_text.css({'top': this.window_height + 'px'});

      var text_height = 0;
      $( "#intro-text > div" ).each(function( index ) {
        var line_height = parseInt(window.getComputedStyle(this).fontSize);
        text_height += line_height;
      });
      $( "#intro-text > div > span" ).each(function( index ) {
        var vary = Math.floor((Math.random() * 5));
        $(this).addClass('floating2');
        $(this).css('-webkit-animation-delay', (1/(index+1)+vary)+'s');
        $(this).css('-moz-animation-delay', (1/(index+1)+vary)+'s');
      });

      var intro_text_top = Math.floor(this.window_height - text_height)/4;
      $intro_text.css({'top': intro_text_top + 'px'});
      $intro_text.show();

      $('.btn-intro').show();
      $('.btn-skip').show();
      
      var comment = document.getElementById(this.getCommentId(0));
      $(comment).hide();
    },

    "initComments": function () {

      var self = this;

      var comments = this.getCurrentComments();
      var length = comments.length;
      var i;

      for (i=0; i<length; i++) {        
        var comment = document.getElementById(this.getCommentId(i));        

        if (comment) {
          comment.currentTime = 0;
          comment.setAttribute('src', '');
          comment.removeAttribute('src');
          comment.setAttribute ("onclick", null);
          
          var vary = Math.floor((Math.random() * 5));
          $(comment).addClass('floating');
          $(comment).css('-webkit-animation-delay', (1/(i+1))+'s');
          $(comment).css('-moz-animation-delay', (1/(i+1))+'s');
          
          // Over effect on/off.
          $(comment).hover(
            function() {
              if (this.paused) {
                $(this).css('-webkit-animation-delay', '0s');
                $(this).css('-moz-animation-delay', '0s');
                $(this).removeClass("floating");
                $(this).addClass("shake");
              }

            },
            function() {
              if (this.paused) {
                $(this).removeClass("shake");
                $(this).addClass("floating");
              }
            }
          );
        }
        else {
          comment = document.createElement('video');          
          comment.id = this.getCommentId(i);
          $(comment).addClass('comment');

          $(comment).hide();
          var left = this.getCommentPosition(i);
          $(comment).css('left', (left)+'px');

          if (this.getCurrentVideoId() == 'intro') {
            // Intro stage doesn't show comments.
          }
          else {
            // Add a random animation offset.
            var vary = Math.floor((Math.random() * 5));
            $(comment).addClass('floating');
            $(comment).css('-webkit-animation-delay', (1/(i+1))+'s');
            $(comment).css('-moz-animation-delay', (1/(i+1))+'s');

            // Over effect on/off.
            $(comment).hover(
              function() {
                if (this.paused) {
                  $(this).css('-webkit-animation-delay', '0s');
                  $(this).css('-moz-animation-delay', '0s');
                  $(this).removeClass("floating");
                  $(this).addClass("shake");
                }

              },
              function() {
                if (this.paused) {
                  $(this).removeClass("shake");
                  $(this).addClass("floating");
                }
              }
            );
          }
        }

        comment.poster = comments[i].poster;
        comment.preload = 'none';
        comment.setAttribute('src', '');
        comment.removeAttribute('src');

        if (this.can_play_mp4 && comments[i].mp4) {
          comment.setAttribute('src', comments[i].mp4);
        }

        if (this.can_play_webm && comments[i].webm) {
          var source = document.createElement('source');
          source.src = comments[i].webm;
          comment.appendChild(source);
        }

        if (this.can_play_ogg && comments[i].ogg) {
          var source = document.createElement('source');
          source.src = comments[i].ogg;
          comment.appendChild(source);
        }

        this.stage.appendChild(comment);

        // Click handler.
        comment.onclick = function (e)
        {
          $(e.target).removeClass("shake");
          $(e.target).removeClass("floating");
          self.clickCommentCallback(e);
        }
        
        /*
        $(comment).dblclick(function() {
          self.toggleFullScreen();
        });
        */

      }

    },

    "showComments": function () {
      var comments = this.getCurrentComments();

      var length = comments.length;
      var i;

      for (i=0; i<length; i++) {
        var comment = document.getElementById(this.getCommentId(i));
        comment.pause();
        comment.style.display = 'block';
        $.Velocity(comment, { top: '70%', opacity: "1" }, 200);
      }
    },

    "hideComments": function (callback) {
      var comments = this.getCurrentComments();
      var length = comments.length;
      var i;

      for (i=0; i<length; i++) {
        var comment = document.getElementById(this.getCommentId(i));
        var position = $(comment).position();
        $.Velocity(comment, { top: (position.top + $(comment).height()) + 'px', opacity: "0" }, 400, callback);
      }
    },

    "getCurrentComments": function () {
      return this.videos[this.current_video_index].comments;
    },

    "getCommentPosition": function (i) {
      var comments = this.getCurrentComments();

      var length = comments.length;
      var width = .16*this.window_width;
      //var height = .24*this.window_height;

      var left = (this.window_width/length)*i + (this.window_width/length - width)/2;
      var ret = Math.round(left);
      return ret;
    },


    "clickCommentCallback": function (e) {

      var self = this;

      this.c = e.target;
      var tmp_src = this.c.src;

      if (this.c.paused) {
        // Comment is not playing.
        this.playComment();

      }
      else {
        // Comment is playing.
        this.stopComment();
      }
    },
    
    "playComment": function () {
      var self = this;
      
      // Play comment.
      this.c.play();

      // Return to main screen at end
      this.c.onended = function(e) {
        $(self.c).removeClass("shake");
        $(self.c).addClass("floating");
        //$(self.c).addClass('viewed');              
        self.stopComment();
      }

      // Effect.
      $(this.c).css('z-index', '9999');
      if (this.getCurrentVideoId() == 'intro') {
        $.Velocity(self.c, { height: '100%', width: '100%', top: 0, left: 0 }, 500, function() {
          $('#overlay').show();
          self.c.setAttribute('controls', 'controls');
        });
      }
      else {
        $.Velocity(self.c, { height: '100%', width: '100%', top: 0, left: 0 }, 500, function() {
          $('#overlay').show();
          self.c.setAttribute('controls', 'controls');
        });
      }

      // Stop the main video.
      this.v.pause();
    },
    
    
    "stopComment": function () {
      var self = this;
      
      this.c.pause();
      self.c.removeAttribute('controls');
      
      $(this.c).css('z-index', '999');

      var i = this.getCommentIndex(this.c);
      var left = this.getCommentPosition(i);

      $('#overlay').hide();

      if (this.getCurrentVideoId() == 'intro') {
  		var window_width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
  	    var window_height = (window.innerHeight > 0) ? window.innerHeight : screen.height;		
    	var percent_height = window_width*9/window_height;
		
        $.Velocity(this.c, {height: percent_height+'%', width: percent_width+'%', top: '70%', left: (left)+'px' }, 500, function() {
          self.v.play();
          self.initComments();
          self.showIntro();           
        });
      }
      else {
		var window_width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
	    var window_height = (window.innerHeight > 0) ? window.innerHeight : screen.height;		
  		var percent_height = window_width*9/window_height;

        $.Velocity(this.c, {height: percent_height+'%', width: '16%', top: '70%', left: (left)+'px' }, 500, function() {
          self.v.play();
          self.initComments();
          self.showComments();
          $(this).addClass("floating");            
        });
      }
    },

    "getCommentIndex": function (c) {
      var i = 0;
      if (c.id == 'comment-0') {
        i = 0;
      }
      else if (c.id == 'comment-1') {
        i = 1;
      }
      else if (c.id == 'comment-2') {
        i = 2;
      }
      else if (c.id == 'comment-3') {
        i = 3;
      }
      else if (c.id == 'comment-4') {
        i = 4;
      }
      return i;
    },

    "getCommentId": function (i) {
      return 'comment-' + i;
    },
    
    "getNextCommentInfos": function () {
            
      var ret = {
        'i_video': 0,
        'i_comment': 0
      };
      
      var comments = this.getCurrentComments();
      var length = comments.length;
      var i = this.getCommentIndex(this.c)
      
      if (i >= length - 1) {
        // This is the last comment in this sequence.
        ret['i_video'] = this.getNextVideoIndex();
        ret['i_comment'] = 0;
      }
      else {
        ret['i_video'] = this.current_video_index;
        ret['i_comment'] = i + 1;
      }
      
      return ret;
    },

    "commentsInitPosition": function () {
      var comments = this.getCurrentComments();
      var i = 0;

      var length = comments.length;
      for (i=0; i<length; i++) {
        var left = this.getCommentPosition(i);
        var comment = document.getElementById(this.getCommentId(i));
        $(comment).css('left', (left)+'px')
      }
    },

    "switchVideo": function (n) {
      var self = this;

      if (n > this.last_video_index) {
        n = this.first_video_index;
      }
      if (n == this.current_video_index) {
        return;
      }      

      var parent = document.getElementById('video');
      $(this.v).css('left', (this.window_width)+'px');

      this.v.pause();

      var mp4 = document.getElementById('mp4');
      var webm = document.getElementById('webm');
      var ogg = document.getElementById('ogg');

      //v.setAttribute("poster", videos[n].poster);
      mp4.setAttribute("src", this.videos[n].mp4);

      if (webm && this.videos[n].webm) {
        if (webm.parentNode == null) {
          parent.insertBefore(webm, mp4);
        }
        webm.setAttribute("src", this.videos[n].webm);
      } else {
        if (webm && webm.parentNode != null) {
          parent.removeChild(webm);
        }
      }

      this.v.load();
      this.v.pause();

      this.current_video_index = n;

      if (n == this.first_video_index) {
        //$('.btn-prev').text(getPreviousVideoTitle());
        $('.btn-prev').hide();
        $('.btn-next').text(this.getNextVideoTitle());
        $('.btn-next').show();
      }
      else if (n == this.last_video_index) {
        //$('.btn-next').text(getNextVideoTitle());
        $('.btn-prev').text(this.getPreviousVideoTitle());
        $('.btn-prev').show();
        $('.btn-next').hide();
      }
      else {
        $('.btn-prev').text(this.getPreviousVideoTitle());
        $('.btn-prev').show();
        $('.btn-next').text(this.getNextVideoTitle());
        $('.btn-next').show();
      }

      //$('.btn-cur').text(this.videos[this.current_video_index].title);
      $('.btn-cur').text(this.getCurrentVideoTitle());
      $('.btn-cur').show();


      $('.btn').hover(
        function() {
          $(this).css('-webkit-animation-delay', '0s');
          $(this).css('-moz-animation-delay', '0s');
          $(this).removeClass("floating");
          $(this).addClass("shake");
        },
        function() {
          $(this).removeClass("shake");
          $(this).addClass("floating");
        }
      );

      /* initial states. */
      this.initZoom();
      this.initRotate();

      this.commentsInitPosition();
      this.initVirtpad();

      this.v.play();

      $.Velocity(self.v, { left: 0 }, 1000);
    },

    "pepStat": function () {
      var ret = {};

      var offset1 = this.virtpad.offset();
      var width1 = this.virtpad.width();
      var height1 = this.virtpad.height();

      var p1 = {
        x: offset1.left + width1 / 2,
        y: offset1.top + height1 / 2
      };

      var offset2 = this.pep.offset();
      var width2 = this.pep.width();
      var height2 = this.pep.height();

      var p2 = {
        x: offset2.left + width2 / 2,
        y: offset2.top + height2 / 2
      };

      var p0 = {
        x: offset1.left + width1 / 2,
        y: offset1.top
      };

      var dx0 = p2.x - p0.x;
      var dy0 = p2.y - p0.y;
      var dx1 = p2.x - p1.x;
      var dy1 = p2.y - p1.y;
      ret.rotate = Math.atan2(dx0, dy0) / Math.PI * 2;

      ret.rate = Math.sqrt( dx1*dx1 + dy1*dy1 ) / width1 * 2 + .5;
      if (ret.rate < this.rate_min) {
        ret.rate = this.rate_min;
      }
      if (ret.rate > this.rate_max) {
        ret.rate = this.rate_max;
      }

      return ret;

    },

    "calculateLargestProportionalRect": function (angle, origWidth, origHeight) {
      var w0, h0;
      if (origWidth <= origHeight) {
        w0 = origWidth;
        h0 = origHeight;
      }
      else {
        w0 = origHeight;
        h0 = origWidth;
      }
      // Angle normalization in range [-PI..PI)
      var ang = angle - Math.floor((angle + Math.PI) / (2*Math.PI)) * 2*Math.PI;
      ang = Math.abs(ang);
      if (ang > Math.PI / 2)
        ang = Math.PI - ang;
      var c = w0 / (h0 * Math.sin(ang) + w0 * Math.cos(ang));
      var w, h;
      if (origWidth <= origHeight) {
        w = w0 * c;
        h = h0 * c;
      }
      else {
        w = h0 * c;
        h = w0 * c;
      }

      return {
        w: w,
        h: h
      }
    },
    
    "virtpadReset": function () {
      var self = this;
      
      $.pep.peps[0].revert();
      self.initZoom();
      self.initRotate();  
    },
    
    "toggleFullScreen": function () {
      if (!document.fullscreenElement &&    // alternative standard method
          !document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
      } else {
        if (document.cancelFullScreen) {
          document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        }
      }
      
      self.window_width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
      self.window_height = (window.innerHeight > 0) ? window.innerHeight : screen.height;

      self.commentsInitPosition();
      
    },

  });


  //
  window.app = new AppKitsou();


})();
