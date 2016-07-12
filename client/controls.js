/**
 * Module dependencies.
 */

var ko = require('knockout');
var moment = require('moment');
var sync = require('./sync');

/**
 * Controls view model.
 */

module.exports = exports = new (function () {
	var self = this;
	self.seek = function () {
		sync.seek(moment.duration(self.seekTime()).asSeconds());
	};
	self.seekTime = ko.observable('');
	self.playpause = function () {
		if (self.playing()) {
			sync.pause();
		} else {
			sync.play();
		}
	};
	self.lockunlock = function () 
	{
		if(self.isLocked())
		{
			sync.unlock();
		}
		else
		{
			sync.lock();
		}
	}
	self.isLocked = ko.observable(false);
	self.playing = ko.observable(false);
	sync.on('state', function (state) {
		self.playing(state.playing);
	});
	sync.on('lock', function (){
		self.isLocked(true);
	});
	sync.on('unlock', function (){
		self.isLocked(false);
	})
})();
