let eventQueue = []
let svg
let element
let drawingArea
let width
let height
let volume = 0.6


let scale_factor = 6
let note_overlap = 2
let note_timeout = 300
let current_notes = 0
let max_life = 20000

let svg_background_color_online = '#0288D1'
let svg_background_color_offline = '#E91E63'
let svg_text_color = '#FFFFFF'
let newuser_box_color = 'rgb(41, 128, 185)'
let push_color = 'rgb(155, 89, 182)'
let issue_color = 'rgb(46, 204, 113)'
let pull_request_color = 'rgb(46, 204, 113)'
let total_sounds = 51

let celesta = []
let clav = []
let swells = []
let all_loaded = false


const socket = io()

socket.on('log', function(data) {
  eventQueue.push(data.log)
  if (eventQueue.length > 1000) eventQueue = eventQueue.slice(0, 1000);
});


socket.on('error', console.error.bind(console));

socket.on('message', console.log.bind(console));

socket.on('connect', function(){
  console.log('socket connected')
  if(svg != null){
    $('svg').css('background-color', svg_background_color_online);
    $('header').css('background-color', svg_background_color_online);
    $('.offline-text').css('visibility', 'hidden');
    $('.events-remaining-text').css('visibility', 'hidden');
    $('.events-remaining-value').css('visibility', 'hidden');
  }
});

socket.on('disconnect', function(){

  if(svg != null){
    $('svg').css('background-color', svg_background_color_offline);
    $('header').css('background-color', svg_background_color_offline);
    $('.offline-text').css('visibility', 'visible');
    $('.events-remaining-text').css('visibility', 'visible');
    $('.events-remaining-value').css('visibility', 'visible');

  }
});

socket.on('error', function(){
  if(svg != null){
    $('svg').css('background-color', svg_background_color_offline);
    $('header').css('background-color', svg_background_color_offline);
    $('.offline-text').css('visibility', 'visible');
    $('.events-remaining-text').css('visibility', 'visible');
    $('.events-remaining-value').css('visibility', 'visible');
  }
});



$(function(){
  element = document.documentElement;
  drawingArea = document.getElementsByTagName('#area')[0];
  width = window.innerWidth || element.clientWidth || drawingArea.clientWidth;
  height = (window.innerHeight  - $('header').height())|| (element.clientHeight - $('header').height()) || (drawingArea.clientHeight - $('header').height());
  $('svg').css('background-color', svg_background_color_online);
  $('header').css('background-color', svg_background_color_online);
  $('svg text').css('color', svg_text_color);
  $('#volumeSlider').slider({
    'max': 100,
    'min': 0,
    'value': volume*100,
    'slide' : function(event, ui){
      volume = ui.value/100.0;
      Howler.volume(volume);
    },
    'change' : function(event, ui){
      volume = ui.value/100.0;
      Howler.volume(volume);
    }
  });

  // Main drawing area
  svg = d3.select("#area").append("svg");
  svg.attr({width: width, height: height});
  svg.style('background-color', svg_background_color_online);

  // For window resizes
  var update_window = function() {
      width = window.innerWidth || element.clientWidth || drawingArea.clientWidth;
      height = (window.innerHeight  - $('header').height())|| (element.clientHeight - $('header').height()) || (drawingArea.clientHeight - $('header').height());
      svg.attr("width", width).attr("height", height);
  }
  window.onresize = update_window;
  update_window();

  var loaded_sounds = 0;
  var sound_load = function(r) {
      loaded_sounds += 1;
      if (loaded_sounds == total_sounds) {
          all_loaded = true;
          setTimeout(playFromQueueExchange1, Math.floor(Math.random() * 1000));
          // Starting the second exchange makes music a bad experience
          setTimeout(playFromQueueExchange2, Math.floor(Math.random() * 2000));
      }
  }

  // Load sounds
  for (var i = 1; i <= 24; i++) {
      if (i > 9) {
          fn = 'c0' + i;
      } else {
          fn = 'c00' + i;
      }
      celesta.push(new Howl({
          src : ['/static/sounds/celesta/' + fn + '.ogg',
                 '/static/sounds/celesta/' + fn + '.mp3', ],
          volume : 0.7,
          onload : sound_load(),
          buffer: true,
      }))
      clav.push(new Howl({
          src : ['/static/sounds/clav/' + fn + '.ogg',
                 '/static/sounds/clav/' + fn + '.mp3', ],
          volume : 0.4,
          onload : sound_load(),
          buffer: true,
      }))
  }

  for (var i = 1; i <= 3; i++) {
      swells.push(new Howl({
          src : ['/static/sounds/swells/swell' + i + '.ogg',
                 '/static/sounds/swells/swell' + i + '.mp3', ],
          volume : 1,
          onload : sound_load(),
          buffer: true,
      }));
  }

  Howler.volume(volume);

  // Make header and footer visible
  $('body').css('visibility', 'visible');

});

function playRandomSwell() {
    var index = Math.round(Math.random() * (swells.length - 1));
    swells[index].play();
}

function playSound(size, type) {
    var max_pitch = 100.0;
    var log_used = 1.0715307808111486871978099;
    var pitch = 100 - Math.min(max_pitch, Math.log(size + log_used) / Math.log(log_used));
    var index = Math.floor(pitch / 100.0 * Object.keys(celesta).length);
    var fuzz = Math.floor(Math.random() * 4) - 2;
    index += fuzz;
    index = Math.min(Object.keys(celesta).length - 1, index);
    index = Math.max(1, index);
    if (current_notes < note_overlap) {
        current_notes++;
        if (type == 'JOIN') {
            clav[index].play();
        } else if(type == 'QUIT') {
            celesta[index].play();
        }else{
          playRandomSwell();
        }
        setTimeout(function() {
            current_notes--;
        }, note_timeout);
    }
}

function playFromQueueExchange1(){
  var event = eventQueue.shift()
  if(event != null && svg != null) {
    playSound(1.1, event.type);
    if(!document.hidden)
      drawEvent(event, svg);
  }
  setTimeout(playFromQueueExchange1, Math.floor(Math.random() * 1000) + 500);
  $('.events-remaining-value').html(eventQueue.length);
}

function playFromQueueExchange2(){
  var event = eventQueue.shift();
  if(event != null && svg != null){
    playSound(1, event.type);
    if(!document.hidden)
      drawEvent(event, svg);
  }
  setTimeout(playFromQueueExchange2, Math.floor(Math.random() * 800) + 500);
  $('.events-remaining-value').html(eventQueue.length);
}

// This method capitalizes the string in place
String.prototype.capitalize=function(all){
    if(all){
      return this.split(' ').map(function(e){
        return e.capitalize().join(' ');
      });
    }else{
         return this.charAt(0).toUpperCase() + this.slice(1);
    }
}


function drawEvent(data, svg_area) {
  const MESSAGE_LENGTH = 10
    var starting_opacity = 1;
    var opacity = 1 / (100 / MESSAGE_LENGTH);
    if (opacity > 0.5) {
        opacity = 0.5;
    }
    var size = MESSAGE_LENGTH;
    var label_text;
    var ring_radius = 80;
    var ring_anim_duration = 3000;
    svg_text_color = '#FFFFFF';
    switch(data.type) {
      case "JOIN":
        label_text = data.user + " connected to the Hub "
        edit_color = '#fff200';
      break;
      case "SEARCH":
        if (data.query.length > 0)
          label_text = 'Someone searched for ' + data.query
        else
          label_text = 'Someone searched'
        // edit_color = '#C6FF00';
        edit_color = "#0bef16"
        ring_anim_duration = 10000;
        ring_radius = 600;
      break;
      case "QUIT":
        label_text = data.user + " disconnected !"
        // edit_color = '#FFEB3B';  // Yellow
        edit_color = '#db7272'
      break;
      case "SHARE":
        label_text = data.user.capitalize() + " shared some of their files <3 ";
        edit_color = "#0bef16";
        break;
    }
    var csize = size;
    var no_label = false;
    var type = data.type;

    var circle_id = 'd' + ((Math.random() * 100000) | 0);
    var abs_size = Math.abs(size);
    size = Math.max(Math.sqrt(abs_size) * scale_factor, 3);

    Math.seedrandom(data.message)
    var x = Math.random() * (width - size) + size;
    var y = Math.random() * (height - size) + size;


    var circle_group = svg_area.append('g')
        .attr('transform', 'translate(' + x + ', ' + y + ')')
        .attr('fill', edit_color)
        .style('opacity', starting_opacity)


    var ring = circle_group.append('circle');
    ring.attr({r: size, stroke: 'none'});
    ring.transition()
        .attr('r', size + ring_radius)
        .style('opacity', 0)
        .ease(Math.sqrt)
        .duration(ring_anim_duration)
        .remove();

    var circle_container = circle_group.append('a');
    circle_container.attr('xlink:href', data.url);
    circle_container.attr('target', '_blank');
    circle_container.attr('fill', svg_text_color);

    var circle = circle_container.append('circle');
    circle.classed(type, true);
    circle.attr('r', size)
      .attr('fill', edit_color)
      .transition()
      .duration(max_life)
      .style('opacity', 0)
      .remove();


    circle_container.on('mouseover', function() {
      circle_container.append('text')
          .text(label_text)
          .classed('label', true)
          .attr('text-anchor', 'middle')
          .attr('font-size', '0.8em')
          .transition()
          .delay(1000)
          .style('opacity', 0)
          .duration(2000)
          .each(function() { no_label = true; })
          .remove();
    });

    var text = circle_container.append('text')
        .text(label_text)
        .classed('article-label', true)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.8em')
        .transition()
        .delay(2000)
        .style('opacity', 0)
        .duration(5000)
        .each(function() { no_label = true; })
        .remove();

  // Remove HTML of decayed events
  // Keep it less than 50
  if($('#area svg g').length > 50){
    $('#area svg g:lt(10)').remove();
  }
}
