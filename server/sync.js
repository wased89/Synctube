/**
 * Module dependencies.
 */

var async = require('async');
var media = require('../lib/media');
var datastore = require('./datastore');
var safesocket = require('safesocket');
var sockets = require('./sockets');

/**
 * Fox Vars
 */
 var rooms = {}; //the list of rooms
 //the room object(inside rooms), has a list of users(by ID), and isLocked var 
 
/**
 * Socket events.
 */

sockets.on('listen', function (io) {

	datastore.on('room', function (room, event, args) {
		
		rooms[room] = 
		{
			users: [],
			isLocked: false,
			mainUser: null
		};
		
		if (event == 'state') {
			io.sockets.in(room).emit('state', args[0]);
		} else if (event == 'put') {
			io.sockets.in(room).emit('put', args[0], args[1]);
		} else if (event == 'move') {
			io.sockets.in(room).emit('move', args[0], args[1]);
		} else if (event == 'remove') {
			io.sockets.in(room).emit('remove', args[0]);
		}
		else if(event == "lock")
		{
			io.sockets.in(room).emit('lock');
		}
		else if(event == "unlock")
		{
			io.sockets.in(room).emit('unlock');
		}
	});

	datastore.on('users', function (room, count) {
		io.sockets.in(room).emit('users', count);
	});

	io.sockets.on('connection', function (socket) {
		socket.once('join', safesocket(1, function (name, callback) {
			datastore.join(name, function (err) {
				if (err) { return; }
				join(socket, name);
			});
		}));
	});

	function join (socket, name) {
		if(rooms[name] == undefined)
		{
			rooms[name] = 
			{
			users: [],
			isLocked: false,
			mainUser: null
			};
		}
		
		socket.join(name);
		
		if(rooms[name].users.length == 0)
		{ rooms[name].mainUser = socket.id;}
		rooms[name].users.push(socket.id);
		updateMainUser(name);
		socket.on('disconnect', function () {
			rooms[name].users.pop(socket.id);
			datastore.leave(name);
			updateMainUser(name);
		});

		socket.on('add', safesocket(2, function (type, id, callback) {
			media.getLength(type, id, function (err, length) {
				if (err) { return callback(err); }
				var video = { id: id, length: length, type: type };
				datastore.addVideo(name, video, callback);
			});
		}));

		socket.on('delete', safesocket(1, function (key, callback) {
			datastore.deleteVideo(name, key, callback);
		}));

		socket.on('move', safesocket(2, function (key, beforeKey, callback) {
			datastore.moveVideo(name, key, beforeKey, callback);
		}));

		socket.on('shuffle', safesocket(0, function (callback) {
			datastore.shufflePlaylist(name, callback);
		}));

		socket.on('cue', safesocket(1, function (key, callback) {
			datastore.playVideo(name, key, callback);
		}));

		socket.on('seek', safesocket(1, function (time, callback) {
			datastore.setOffset(name, time, callback);
		}));

		socket.on('play', safesocket(0, function (callback) {
			if(isLocked(name)){callback("Room is locked"); return;}
			datastore.setPlaying(name, true, callback);
		}));

		socket.on('pause', safesocket(0, function (callback) {
			if(isLocked(name)){callback("Room is locked"); return;}
			datastore.setPlaying(name, false, callback);
		}));
		socket.on('lock', safesocket(0, function(callback) {
			if(isLocked(name)){return;}
			if(socket.id == rooms[name].mainUser){toggleLock(name, true);}
		}))
		socket.on('unlock', safesocket(0, function(callback){
			if(!isLocked(name)){return;}
			if(socket.id == rooms[name].mainUser){toggleLock(name, false);}
		}))

		async.parallel({
			playlist: async.apply(datastore.getPlaylist, name),
			state: async.apply(datastore.getState, name),
			users: async.apply(datastore.getUserCount, name),
		}, function (err, result) {
			if (err) { console.warn(err); return; }
			socket.emit('playlist', result.playlist);
			socket.emit('state', result.state);
			socket.emit('users', result.users);
		});
	}
	function updateMainUser(room)
	{
		if(rooms[room].users.length == 0) 
		{rooms[room].mainUser = null; return;}
		rooms[room].mainUser = rooms[room].users[0];
	}
	function toggleLock(room, islocked)
	{
		rooms[room].isLocked = islocked;
	}
	function isLocked(room)
	{
		return rooms[room].isLocked;
	}
});
