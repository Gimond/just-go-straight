var jsfxr = require('./jsfxr');
var loop = require('./loop');
var key = require('./key');

(function(){
  function rand_int(max) {
    return Math.random() * (max || 0xfffffff) | 0;
  }
  function rand_range(min, max) {
    return rand_int(max - min) + min;
  }

  var canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  canvas.style.backgroundColor = '#000';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;

  var mob = {};
  var beach = {};
  var jungle = {};
  var jungle_save = [];
  var jungle_saved_index = -1;
  init();

  var sounds = {
    pickup: [0,,0.0247,0.3763,0.2638,0.8004,,,,,,0.4915,0.5263,,,,,,1,,,,,0.5],
    screen_change: [0,,0.1223,,0.2985,0.4522,,0.2578,,,,,,0.2074,,,,,0.8619,,,,,0.5],
    win: [0,,0.42,,0.61,0.4823,0.3,0.28,0.08,,,,,0.5228,,0.4983,,,1,,,,,0.5],
    empty: [1,,0.27,,0.59,0.45,,-0.2325,,,,,,0.0266,0.1374,,,,1,,,,,0.5],
    step: [1,,0.0284,,0.1618,0.397,,-0.6104,,,,,,,,,,,1,,,0.2436,,0.5],
    hit: [3,,0.0833,,0.1303,0.3802,,-0.4149,,,,,,,,,,,1,,,0.1488,,0.5],
    wave: [3,0.56,0.39,,0.85,0.41,,0.26,0.12,,,0.08,,,,,,,0.4,,,,-0.26,0.5]
  };
  Object.keys(sounds).map(function(objectKey, index) {
    var soundURL = jsfxr.init(sounds[objectKey]);
    sounds[objectKey] = new Audio();
    sounds[objectKey].src = soundURL;
  });

  var beach_bg = new Image();
  beach_bg.src = 'b.png';

  var pirate = new Image();
  pirate.src = 'p.png';

  var treasure = new Image();
  treasure.src = 't.png';

  var jungle_sprite = new Image();
  jungle_sprite.src = 'j.png';

  var jungle_sprite_b = new Image();
  jungle_sprite_b.src = 'k.png';

  var items_sprite = new Image();
  items_sprite.src = 'i.png';

  var wave = new Image();
  wave.src = 'w.png';

  // 0 = cheater
  // 1 = lose
  // 2 = forgot shovel
  // 3 = win
  var endings = [false, false, false, false];
  // var endings = [true, true, true, true];
  var game_complete = false;

  var timer = 0;
  var timer_step = 0;
  var timer_eyes = 0;
  var timer_anim_win = 0;
  var timer_wave = 2;
  var timeout_game_complete = 1;
  // var secret_path = [1,3,0,1,0,2,3,0,2,1,1,0,3,2,0,1,3,3,3,1,2,0];
  var cheat_path = [0,0,2,2,3,1,3,1];

  // game loop
  loop.start(function (dt) {
    timer+= dt;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mob.end > -1 && key.isDown(key.ENTER) && (endings[0] && endings[1] && endings[2] && endings[3]) && !game_complete) {
      sounds['win'].play();
      game_complete = true;
    }
    if (mob.end > -1 && key.isDown(key.ENTER) && (!game_complete || timeout_game_complete <= 0)) {
      if (game_complete) {
        game_complete = false;
        endings = [false, false, false, false];
      }
      init();
      sounds['screen_change'].play();
    }

    mob.prev_x = mob.x;
    mob.prev_y = mob.y;

    // update mob
    mob.moving = false;
    if (!mob.win && !mob.back_to_beach) {
      if (key.isDown(key.UP)) {
        mob.y = mob.y - (300 * dt);
        mob.dir = 0;
        mob.moving = true;
        check_collisions();
      }
      if (key.isDown(key.RIGHT)) {
        mob.x = mob.x + (300 * dt);
        mob.dir = 1;
        mob.moving = true;
        check_collisions();
      }
      if (key.isDown(key.DOWN)) {
        mob.y = mob.y + (300 * dt);
        mob.dir = 2;
        mob.moving = true;
        check_collisions();
      }
      if (key.isDown(key.LEFT)) {
        mob.x = mob.x - (300 * dt);
        mob.dir = 3;
        mob.moving = true;
        check_collisions();
      }
    }
    if (mob.back_to_beach) {
      if (mob.x > 550) {
        mob.x = mob.x - (100 * dt);
        mob.dir = 3;
        mob.moving = true;
      } else {
        mob.back_to_beach = false;
      }
    }

    // check bounds collisions
    if (mob.x < 10) {
      mob.x = canvas.width-10;
      lost(3);
      generate_jungle(3);
    } else if (mob.x > canvas.width - 10) {
      mob.x = 10;
      mob.beach = false;

      if (!mob.lost) {
        mob.straight_count++;

        if (mob.straight_count > 5) {
          mob.win = true;
          mob.x = 10;
          mob.y = 320;
        }
      } else {
        lost(1);
      }
      generate_jungle(1);
    }
    if (mob.y < 236) {
      mob.x = 278;
      mob.y = canvas.height-10;
      lost(0);
      generate_jungle(0);
    } else if (mob.y > canvas.height-10) {
      mob.x = 378;
      mob.y = 240;
      lost(2);
      generate_jungle(2);
    }

    if (mob.beach) {
      // draw beach
      ctx.drawImage(beach_bg, 0, 0, canvas.width, canvas.height);
      if (timer_wave > 3) {
        ctx.drawImage(wave, 136, 360, 504, 72);
      }
      if (timer_wave > 5) {
        timer_wave = 0;
        sounds['wave'].play();
      }
      timer_wave+= dt;
    } else if (mob.win) {
      // draw end screen
      ctx.drawImage(treasure, 0, 0, canvas.width, canvas.height);

      if (mob.never_lost && (mob.shovel || mob.end_shovel > 0)) {
        mob.walk_to = 316;

        if (mob.x >= 240) {
          // shovel ready
          mob.shovel = false;
          mob.end_shovel = 1;
        }
        if (mob.x >= mob.walk_to) {
          timer_anim_win+= dt;

          if (timer_anim_win > 0.5) {
            // shovel down
            if (!mob.dug) {
              sounds['hit'].play();
              mob.dug = true;
            }
            mob.end_shovel = 2;
          }
          if (timer_anim_win > 1) {
            ctx.drawImage(items_sprite, 65, 0, 40, 28, 248, 236, 160, 112);
            ctx.drawImage(items_sprite, 10, 5, 22, 19, 280, 264, 88, 76);
            if (mob.y != 236) {
              jungle.steps.splice(jungle.steps.length - 5);
              mob.y = 236;
            }
          }
          if (timer_anim_win > 1.5) {
            mob.dir = 2;
            mob.end_shovel = 0;
            mob.shovel = true;

            if (mob.cheated) {
              sounds['win'].play();
              mob.end = 0;
              mob.cheated = false;
            }
            if (mob.end == -1) {
              sounds['win'].play();
              mob.end = 3;
            }
          }
        }
        if (mob.x >= 150 && mob.sword) {
          sounds['hit'].play();
          mob.sword = false;
          mob.end_sword = true;
        }
      }
      if (!mob.never_lost) {
        mob.walk_to = 200;
        // empty chest
        ctx.drawImage(items_sprite, 65, 0, 40, 28, 248, 236, 160, 112);
        if (mob.x >= mob.walk_to && mob.end == -1) {
          sounds['empty'].play();
          mob.end = 1;
        }
      }
      if (mob.never_lost && (!mob.shovel && mob.end_shovel == 0)) {
        mob.walk_to = 294;
        // no shovel
        if (mob.x >= mob.walk_to && mob.end == -1) {
          sounds['empty'].play();
          mob.end = 2;
          mob.dir = 2;
        }
        if (mob.x >= 150 && mob.sword) {
          sounds['hit'].play();
          mob.sword = false;
          mob.end_sword = true;
        }
      }

      if (mob.x <= mob.walk_to) {
        mob.x = mob.x + (100 * dt);
        mob.dir = 1;
        mob.moving = true;
      }
    } else {
      // draw jungle
      // tiles
      var tile_x = 0;
      jungle.tileset.forEach(function(index) {
        ctx.drawImage(jungle_sprite, index*40, 0, 40, 87, tile_x, 0, 160, 348);
        if (jungle.sign == 0 && index == 3)
          ctx.drawImage(items_sprite, 46, 0, 10, 15, tile_x+20, 196, 40, 60);
        tile_x+=160;
      });
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(0, 344, 640, 136);
    }

    // feet
    if (mob.moving) {
      timer_step += dt;
      if (((mob.back_to_beach || mob.win) && timer_step > 0.09) || (!mob.back_to_beach && !mob.win && timer_step > 0.04)) {
        timer_step = 0;
        var step = {};
        if (mob.step) {
          step = {x: mob.x +8, y: mob.y};
          mob.step = 0;
        } else {
          step = {x: mob.x -12, y: mob.y-4};
          mob.step = 1;
        }
        if (mob.beach)
          beach.steps.push(step);
        else
          jungle.steps.push(step);
      }
    }
    // steps
    ctx.fillStyle = '#d6ad09';
    if (mob.beach) {
      beach.steps.forEach(function(step) {
        ctx.fillRect(step.x, step.y, 4, 4);
      });
    } else {
      jungle.steps.forEach(function(step) {
        ctx.fillRect(step.x, step.y, 4, 4);
      });
    }

    // objects
    if (mob.beach) {
      if (beach.shovel)
        ctx.drawImage(items_sprite, 84, 52, 7, 9, 416, 276, 28, 36);
    }
    if (!mob.beach && !mob.win) {
      if (jungle.sword) {
        ctx.drawImage(items_sprite, 56, 0, 4, 9, jungle.sword_x, 292, 16, 36);
      }
      if (jungle.hat) {
        ctx.drawImage(items_sprite, 0, 0, 10, 10, jungle.hat_x, 292, 40, 40);
        if (!mob.hat)
          ctx.drawImage(items_sprite, 36, 0, 10, 5, jungle.hat_x, 292, 40, 20);
      }
      // left sign
      if (jungle.sign == 3)
        ctx.drawImage(items_sprite, 90, 28, 12, 14, 14, 238, 48, 56);
    }

    // draw pirate
    ctx.drawImage(pirate, mob.dir*8, 0, 8, 9, mob.x - 16, mob.y-36, 32, 36);

    // feet
    ctx.fillStyle = '#4e3d1f';
    if (mob.moving) {
      if (Math.ceil(timer * 10) % 2 == 0) {
        sounds['step'].play();
        ctx.fillRect(mob.x+8, mob.y, 4, 4);
      } else {
        ctx.fillRect(mob.x-12, mob.y, 4, 4);
      }
    } else {
      ctx.fillRect(mob.x+8, mob.y, 4, 4);
      ctx.fillRect(mob.x-12, mob.y, 4, 4);
    }

    // equipment
    if (mob.dir == 0) {
      if (mob.shovel)
        ctx.drawImage(items_sprite, 79, 52, 2, 8, mob.x-20, mob.y-32, 8, 32);
      if (mob.sword)
        ctx.drawImage(items_sprite, 60, 0, 2, 10, mob.x+12, mob.y-44, 8, 40);
      if (mob.hat)
        ctx.drawImage(items_sprite, 10, 0, 8, 5, mob.x-16, mob.y-40, 32, 20);
    }
    if (mob.dir == 1) {
      if (mob.hat)
        ctx.drawImage(items_sprite, 18, 0, 10, 5, mob.x-24, mob.y-48, 40, 20);
      if (mob.sword)
        ctx.drawImage(items_sprite, 60, 0, 2, 10, mob.x-12, mob.y-44, 8, 40);
      if (mob.shovel)
        ctx.drawImage(items_sprite, 79, 49, 12, 3, mob.x-28, mob.y-12, 48, 12);
    }
    if (mob.dir == 2) {
      if (mob.shovel)
        ctx.drawImage(items_sprite, 81, 52, 3, 8, mob.x+8, mob.y-20, 12, 32);
      if (mob.hat)
        ctx.drawImage(items_sprite, 28, 0, 8, 5, mob.x-16, mob.y-44, 32, 20);
      if (mob.sword)
        ctx.drawImage(items_sprite, 62, 0, 2, 10, mob.x -20, mob.y-44, 8, 40);
    }
    if (mob.dir == 3) {
      if (mob.shovel)
        ctx.drawImage(items_sprite, 79, 46, 12, 3, mob.x-20, mob.y-12, 48, 12);
      if (mob.sword)
        ctx.drawImage(items_sprite, 62, 0, 2, 10, mob.x -20, mob.y-44, 8, 40);
      if (mob.hat)
        ctx.drawImage(items_sprite, 36, 0, 10, 5, mob.x-16, mob.y-48, 40, 20);
    }
    if (mob.end_shovel == 1) {
      ctx.drawImage(items_sprite, 79, 63, 12, 3, mob.x-16, mob.y-16, 48, 12);
    }
    if (mob.end_shovel == 2) {
      ctx.drawImage(items_sprite, 79, 66, 12, 7, mob.x-16, mob.y-20, 48, 28);
    }

    // end
    if (mob.end > -1) {
      // press enter
      ctx.drawImage(items_sprite, 0, 28, 90, 18, 136, 392, 360, 72);

      // ending panel
      endings[mob.end] = true;
      ctx.fillStyle = '#bd7100';
      ctx.fillRect(142, 32, 356, 4);
      ctx.fillRect(138, 36, 364, 44);
      ctx.fillStyle = '#905600';
      ctx.fillRect(138, 76, 4, 4);
      ctx.fillRect(498, 76, 4, 4);
      ctx.fillRect(142, 80, 356, 4);

      endings.forEach(function(ending, index) {
        ctx.fillStyle = '#bd7100';
        ctx.fillRect(index*36+256+4, 24, 8, 4);
        ctx.fillRect(index*36+256, 28, 16, 4);
        ctx.fillStyle = '#905600';
        ctx.fillRect(index*36+256+4, 28, 8, 8);

        if (ending) {
          ctx.fillStyle = '#ff0033';
          ctx.fillRect(index*36+256+4, 28, 8, 8);

          // red blink on current ending
          if (mob.end == index && Math.ceil(timer * 10) % 3 == 0) {
            ctx.fillStyle = '#905600';
            ctx.fillRect(index*36+256+4, 28, 8, 8);
          }
        }
      });

      ctx.drawImage(items_sprite, 0, mob.end*9+46, 79, 9, 162, 42, 316, 36);
    }

    if (!mob.beach && !mob.win) {
      // draw jungle bottom
      var tileb_x = 0;
      jungle.tilesetb.forEach(function(index) {
        ctx.drawImage(jungle_sprite_b, index*40, 0, 40, 39, tileb_x, 324, 160, 156);
        if (jungle.sign == 2 && index == 3)
          ctx.drawImage(items_sprite, 90, 28, 12, 14, tile_x+100, 404, 48, 56);
        tileb_x+=160;
      });

      // right sign
      if (jungle.sign == 1)
        ctx.drawImage(items_sprite, 46, 0, 10, 15, 586, 332, 40, 60);
    }
    if (mob.end_sword) {
      ctx.drawImage(items_sprite, 56, 0, 4, 9, 150, 304, 16, 36);
    }

    if (jungle.eyes_x > 0 && timer_eyes < 3) {
      ctx.fillStyle = '#ff0033';
      ctx.fillRect(jungle.eyes_x, jungle.eyes_y, 4, 4);
      ctx.fillRect(jungle.eyes_x+12, jungle.eyes_y, 4, 4);
    }
    if (timer_eyes >= 3.2) {
      timer_eyes = 0;
    } else {
      timer_eyes+= dt;
    }

    // message on game complete
    if (game_complete) {
      timeout_game_complete-= dt;

      ctx.fillStyle = 'rgba(189,113,0,0.9)';
      ctx.fillRect(30,30,580,420);

      ctx.drawImage(items_sprite, 0, 81, 99, 9, 122, 100, 396, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px serif';
      var txt = 'You have found every possible ending and completed the game,\nI hope you enjoyed it.\nDid you find the konami code ending by yourself?\nIf you did, i\'m impressed, give me a shout on twitter @bibishop\n\nPressing Enter again will reset the game and you will lose all\nthe achievements.';
      var x = 60;
      var y = 210;
      var lineheight = 25;
      var lines = txt.split('\n');

      for (var i = 0; i<lines.length; i++) {
        ctx.fillText(lines[i], x, y + (i * lineheight));
      }
    }

    console.log(timeout_game_complete);

    // draw collision
    // beach.bounds.forEach(function(bound) {
    //   ctx.fillStyle = 'rgba(255,255,255,0.2)';
    //   ctx.fillRect(bound.x, bound.y, bound.width, bound.height);
    // });

    mob.prev_x = mob.x;
    mob.prev_y = mob.y;
  });

  function lost(path_taken) {
    mob.path_followed.push(path_taken);
    var cheat_path_part = cheat_path.slice(0,mob.path_followed.length);
    if (cheat_path_part.join(',') == mob.path_followed.join(',')) {
      // following the secret path
      if (mob.path_followed.length == cheat_path.length) {
        mob.lost = false;
        mob.never_lost = true;
        mob.win = true;
        mob.x = 10;
        mob.y = 320;
        mob.cheated = true;
        mob.shovel = true;
      }
      mob.lost = true;
      return;
    } else if (rand_int(40) < mob.chance_to_beach) {
      // back to the beach
      mob.back_to_beach = true;
      mob.beach = true;
      mob.lost = false;
      mob.chance_to_beach = 0;
      mob.x = canvas.width - 10;
      mob.y = 330;
      mob.path_followed = [];
      sounds['screen_change'].play();
      return;
    }
    // truly lost
    mob.lost = true;
    mob.never_lost = false;
    mob.straight_count = 0;
    mob.chance_to_beach++;
  }

  function generate_jungle(path_taken) {
    // if it is already a clone, we update the copy to keep the steps
    if (jungle.clone_index > -1) {
      var jungle_clone_2 = clone(jungle);
      jungle_saved_index = jungle_clone_2.clone_index;
      jungle_save[jungle_clone_2.clone_index] = jungle_clone_2;
    }
    if (jungle.clone_index == -1 && (jungle.hat || (jungle.sign > -1 && jungle_save.length < 3))) {
      // landmark? we save the jungle screen to serve it later so the player feel lost
      // always save when the hat is here, save some signs
      var jungle_clone = clone(jungle);
      jungle_clone.clone_index = jungle_save.length;
      jungle_save.push(jungle_clone);
      jungle_saved_index = jungle_save.length-1;
    }


    jungle = {
      sign: -1,
      sword: false,
      hat: false,
      steps: [],
      bound: [],
      tileset: [],
      tilesetb: [],
      clone_index: -1,
      eyes_x: 0,
      eyes_y: 0
    };
    jungle.steps = [];
    if (mob.beach || mob.win) return;

    // pick a saved jungle
    // need at least 2 saved jungles and don't include if just saved
    if (rand_int(11) > 6 && jungle_save.length > 1) {
      var rand = 0;
      var jungle_save_copy = jungle_save.slice(0);
      if (jungle_saved_index > -1) {
        jungle_save_copy.splice(jungle_saved_index, 1);
      }
      rand = rand_int(jungle_save_copy.length);
      // rand = rand_int(jungle_save.length);

      jungle = clone(jungle_save_copy[rand]);
      sounds['screen_change'].play();

      jungle.tileset.forEach(function(tile, index){
        if (path_taken == 2 && tile == 3)
          mob.x = index*160+82;
      });
      jungle.tilesetb.forEach(function(tile, index){
        if (path_taken == 0 && tile == 3)
          mob.x = index*160+82;
      });

      jungle_saved_index = -1;
      console.log('trying to serve : '+rand);
      console.log(JSON.stringify(jungle));
      return;
    }
    jungle_saved_index = -1;

    // tiles
    jungle.tileset = [rand_int(3),rand_int(3),rand_int(3),rand_int(3)];
    jungle.tilesetb = [rand_int(3),rand_int(3),rand_int(3),rand_int(3)];
    var index_path_top = rand_int(4);
    var index_path_bottom = rand_int(4);
    jungle.tileset[index_path_top] = 3;
    jungle.tilesetb[index_path_bottom] = 3;

    if (path_taken == 0)
      mob.x = index_path_bottom*160+82;
    if (path_taken == 2)
      mob.x = index_path_top*160+78;

    var eyes_index = rand_int(6);
    // bounds + eyes
    jungle.bounds = [];
    jungle.tileset.forEach(function(tile, index) {
      if (tile == 3) {
        jungle.bounds.push({x: index*160, y: 0, width: 56, height: 308});
        jungle.bounds.push({x: index*160+96, y: 0, width: 64, height: 308});
      } else {
        jungle.bounds.push({x: index*160, y: 0, width: 160, height: 308});

        if (eyes_index == index && tile == 2) {
          jungle.eyes_x = index*160+rand_range(10, 144);
          jungle.eyes_y = rand_range(186, 217);
        }
        eyes_index++;
      }
    });
    jungle.tilesetb.forEach(function(tile, index) {
      if (tile == 3) {
        jungle.bounds.push({x: index*160, y: 344, width: 60, height: 136});
        jungle.bounds.push({x: index*160+100, y: 344, width: 60, height: 136});
      } else {
        jungle.bounds.push({x: index*160, y: 344, width: 160, height: 136});

        if (eyes_index == index) {
          jungle.eyes_x = index*160+rand_range(10, 144);
          jungle.eyes_y = rand_range(424,460);
        }
        eyes_index++;
      }
    });

    // items
    jungle.sword = false;
    jungle.hat = false;
    jungle.sign = -1;
    if (!mob.sword && rand_int(11) > 6) {
      jungle.sword = true;
      jungle.sword_x = rand_range(100,550);
    }
    if (!mob.hat && !jungle.sword && rand_int(11) > 6) {
      jungle.hat = true;
      jungle.hat_x = rand_range(100,550);
    }
    if (!jungle.hat && !jungle.sword && rand_int(11) > 4) {
      var possible_sign_positions = [];
      if (path_taken == 0) possible_sign_positions = [0,1,3];
      if (path_taken == 1) possible_sign_positions = [0,1,2];
      if (path_taken == 2) possible_sign_positions = [1,2,3];
      if (path_taken == 3) possible_sign_positions = [0,2,3];
      jungle.sign = possible_sign_positions[rand_int(3)];
    }

    sounds['screen_change'].play();
  }

  function check_collisions() {
    var bounds = {};
    if (mob.beach)
      bounds = beach.bounds;
    else
      bounds = jungle.bounds;

    bounds.forEach(function(bound) {
      if (bound.x < mob.x &&
        bound.x + bound.width > mob.x &&
        bound.y < mob.y &&
        bound.height + bound.y > mob.y) {
        mob.x = mob.prev_x;
        mob.y = mob.prev_y;
        mob.moving = false;
      }
    });

    if (jungle.sword && jungle.sword_x < mob.x &&
      jungle.sword_x + 20 > mob.x &&
      304 < mob.y &&
      344 > mob.y) {
      jungle.sword = false;
      mob.sword = true;
      sounds['pickup'].play();
    }
    if (!mob.hat && (jungle.hat && jungle.hat_x < mob.x &&
        jungle.hat_x + 40 > mob.x &&
        300 < mob.y &&
        340 > mob.y)) {
      mob.hat = true;
      sounds['pickup'].play();
    }
    if (mob.beach && beach.shovel && (416 < mob.x &&
        432 + 24 > mob.x &&
        268 < mob.y &&
        312 > mob.y)) {
      beach.shovel = false;
      mob.shovel = true;
      sounds['pickup'].play();
    }
  }

  function init() {
    mob = {
      x: 400,
      y: 324,
      dir: 1,
      moving: false,
      step: 0,
      lost: false,
      straight_count: 0,
      chance_to_beach: 0,
      win: false,
      beach: true,
      back_to_beach: false,
      sword: false,
      hat: false,
      shovel: false,
      never_lost: true,
      path_followed: [],
      end: -1,
      cheated: false,
      end_sword: false,
      end_shovel: 0,
      dug: false
    };

    jungle = {
      sign: -1,
      sword: false,
      hat: false,
      steps: [],
      bounds: [],
      tileset: [],
      tilesetb: [],
      clone_index: -1,
      eyes_x: 0,
      eyes_y: 0
    };

    beach = {
      bounds: [
        {x: 0, y: 0, width: 640, height: 284},
        {x: 0, y: 0, width: 360, height: 480},
        {x: 0, y: 380, width: 640, height: 96},
        {x: 580, y: 340, width: 60, height: 140},
        {x: 0, y: 0, width: 372, height: 312},
        {x: 0, y: 0, width: 400, height: 308},
        {x: 0, y: 0, width: 432, height: 304},
        {x: 0, y: 0, width: 464, height: 300},
        {x: 0, y: 0, width: 488, height: 296},
        {x: 468, y: 284, width: 160, height: 24}
      ],
      shovel: true,
      steps: []
    };

    jungle_save = [];

    timer = 0;
    timer_step = 0;
    timer_anim_win = 0;
    timeout_game_complete = 1;
  }

  function clone(obj) {
    var copy;
    if(Array.isArray(obj)) {
      copy = obj.map(function(elm) {
        return Array.isArray(elm) || (typeof elm === 'object' && elm) ? clone(elm) : elm;
      });
    } else {
      copy = {};
      for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) {
          if(Array.isArray(obj[attr]) || (typeof obj[attr] === 'object' && obj[attr])) {
            copy[attr] = clone(obj[attr]);
          } else {
            copy[attr] = obj[attr];
          }
        }
      }
    }
    return copy;
  }

}());
