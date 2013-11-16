/*globals define*/
define([
  'input',
  'entities/camera',
  'physics/collision',
  'physics/intersection',
  'utils'
], function( Input, Camera, Collision, Intersection, Utils ) {
  'use strict';

  function Game() {
    this.prevTime = Date.now();
    this.currTime = this.prevTime;

    this.running = true;

    this.element = document.createElement( 'div' );
    this.canvas  = document.createElement( 'canvas' );
    this.ctx     = this.canvas.getContext( '2d' );

    this.element.appendChild( this.canvas );

    this.WIDTH  = 640;
    this.HEIGHT = 480;

    this.canvas.width  = this.WIDTH;
    this.canvas.height = this.HEIGHT;

    this.entities = [];
    this.player = null;

    this.camera = new Camera( 0.5 * this.WIDTH, 0.5 * this.HEIGHT );
    this.camera.world = this;
    this.camera.stroke.set({
      blue: 255,
      alpha: 1.0
    });

    this.camera.width = this.WIDTH;
    this.camera.height = this.HEIGHT;

    this.camera.margin = 50;
    this.camera.lineWidth = 2;

    this.level = null;

    this.input = new Input();
    this.input.game = this;

    // Minimum of 30 fps.
    this.MAX_FRAME_TIME = 1000 / 30;

    this.debug = {};

    this.debug.objects = [
      [
        [ 600, 150, 500, 150 ],
        [ 500, 150, 300, 250 ],
        [ 300, 250,  40, 200 ],
        [  40, 200,  40, 100 ]
      ],
      [
        // Rectangle.
        [ 100, 0, 200, 0 ],
        [ 200, 0, 200, -50 ],
        [ 200, -50, 100, -50 ],
        [ 100, -50, 100, 0 ]
      ]
    ];
  }

  Game.instance = null;

  Game.prototype.update = function() {
    this.input.update();

    this.currTime = Date.now();
    var dt = this.currTime - this.prevTime;
    this.prevTime = this.currTime;

    if ( dt > this.MAX_FRAME_TIME ) {
      dt = this.MAX_FRAME_TIME;
    }

    dt *= 1e-3;

    this.entities.forEach(function( entity ) {
      entity.update( dt );
    });

    this.updateDebug( dt );

    Collision.broadphase( this.entities );

    this.camera.update( dt );
  };

  Game.prototype.draw = function() {
    var ctx = this.ctx;

    var level = this.level;
    if ( level.fill.alpha ) {
      ctx.fillStyle = level.fill.rgba();
      ctx.fillRect( 0, 0, ctx.canvas.width, ctx.canvas.height );
    } else {
      ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height );
    }

    ctx.save();
    this.camera.applyTransform( ctx );

    this.entities.forEach(function( entity ) {
      entity.draw( ctx );
    });

    this.camera.draw( ctx );
    this.drawDebug();

    ctx.restore();
  };

  function isCircle( shape ) {
    return shape.type === 'Circle';
  }

  Game.prototype.updateDebug = function( dt ) {
    var circleEntities = this.entities.filter(function( entity ) {
      return entity.shapes.some( isCircle );
    });

    var collision = this.debug.collision = [];

    var manifolds = [];

    this.debug.objects.forEach(function( object ) {
      object.forEach(function( segment, index ) {
        var x0 = segment[0],
            y0 = segment[1],
            x1 = segment[2],
            y1 = segment[3];

        var normal = Utils.lineNormal( x0, y0, x1, y1 );

        // Get intersection points.
        circleEntities.forEach(function( circleEntity ) {
          var circles = circleEntity.shapes.filter( isCircle );

          var circle = circles[0];

          var x = circleEntity.x + circle.x,
              y = circleEntity.y + circle.y,
              radius = circle.radius,
              radiusSquared = radius * radius;

          var dx = x1 - x0;
          var dy = y1 - y0;

          var dx0 = x - x0;
          var dy0 = y - y0;
          var dx1 = x1 - x;
          var dy1 = y1 - y;

          var u = dx * dx1 + dy * dy1;
          var v = dx * dx0 + dy * dy0;

          var distance;
          var distanceSquared;
          var scale;

          var edx, edy;
          // Region A.
          if ( v <= 0 ) {
            distanceSquared = dx0 * dx0 + dy0 * dy0;
            if ( distanceSquared > radiusSquared ) {
              return;
            }

            // Previous edge.
            if ( index > 0 ) {
              var ex1 = object[ index - 1 ][2];
              var ey1 = object[ index - 1 ][3];

              edx = x0 - ex1;
              edy = y0 - ey1;

              var eu = edx * -dx0 + edy * -dy0;

              if ( eu > 0 ) {
                return;
              }
            }

            distance = Math.sqrt( distanceSquared );
            scale = ( distance - radius ) / distance;
            manifolds.push({
              entity: circleEntity,
              dx: 0, // -dx0 * scale,
              dy: 0  // -dy1 * scale
            });

            return;
          }

          // Region B.
          if ( u <= 0 ) {
            distanceSquared = dx1 * dx1 + dy1 * dy1;
            if ( distanceSquared > radiusSquared ) {
              return;
            }

            // Next edge.
            if ( index < object.length - 1 ) {
              var ex0 = object[ index + 1 ][0];
              var ey0 = object[ index + 1 ][1];

              edx = ex0 - x1;
              edy = ey0 - y1;

              var ev = edx * -dx1 + edy * -dy1;

              if ( ev > 0 ) {
                return;
              }
            }

            distance = Math.sqrt( distanceSquared );
            scale = ( distance - radius ) / distance;
            // Distance between circle edge and line segment.
            distance -= radius;
            manifolds.push({
              entity: circleEntity,
              dx: 0, // dx1 * scale,
              dy: 0  // dy1 * scale
            });

            return;
          }

          // Region AB.
          var denominator = dx * dx + dy * dy;
          var invLength = 1 / denominator;
          var ux0 = u * x0;
          var uy0 = u * y0;
          var vx1 = v * x1;
          var vy1 = v * y1;
          var px = invLength * ( ux0 + vx1 );
          var py = invLength * ( uy0 + vy1 );
          var cdx = x - px;
          var cdy = y - py;
          distanceSquared = cdx * cdx + cdy * cdy;

          if ( distanceSquared > radiusSquared ) {
            return;
          }

          var nx = -dy;
          var ny = dx;
          if ( nx * dx0 + ny * dy0 < 0 ) {
            nx = -nx;
            ny = -ny;
          }

          var invNormalLength = 1 / Math.sqrt( nx * nx + ny * ny );
          nx *= invNormalLength * ( radius - Math.sqrt( distanceSquared ) );
          ny *= invNormalLength * ( radius - Math.sqrt( distanceSquared ) );

          manifolds.push({
            entity: circleEntity,
            dx: nx,
            dy: ny
          });
        });
      });

      manifolds.forEach(function( manifold ) {
        if ( typeof manifold.dx === 'undefined' ||
             typeof manifold.dy === 'undefined' ) {
          // console.log( manifold.dx, manifold.dy );
        }
        manifold.entity.x += manifold.dx;
        manifold.entity.y += manifold.dy;
      });
    });

    // Basic camera controls.
    // W. Zoom in.
    if ( this.input.keys[ 87 ] ) {
      this.camera.width = Math.max( this.camera.width - 4, 160 );
      this.camera.height = Math.max( this.camera.height - 3, 120 );
    }
    // S. Zoom out.
    if ( this.input.keys[ 83 ] ) {
      this.camera.width += 4;
      this.camera.height += 3;
    }
    // A. Rotate left.
    if ( this.input.keys[ 65 ] ) {
      this.camera.rotation += dt;
    }
    // D. Rotate right.
    if ( this.input.keys[ 68 ] ) {
      this.camera.rotation -= dt;
    }
    // Q. Reset camera.
    if ( this.input.keys[ 81 ] ) {
      this.camera.width = this.WIDTH;
      this.camera.height = this.HEIGHT;
      this.camera.rotation = 0;
    }
  };

  Game.prototype.drawDebug = function() {
    var ctx = this.ctx;

    var circleEntities = this.entities.filter(function( entity ) {
      return entity.shapes.some( isCircle );
    });


    this.debug.collision.forEach(function( segment ) {
      var x0 = segment[0],
          y0 = segment[1],
          x1 = segment[2],
          y1 = segment[3];

      ctx.beginPath();
      ctx.moveTo( x0, y0 );
      ctx.lineTo( x1, y1 );
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'blue';
      ctx.stroke();
    });

    function flatten( array, subarray ) {
      return array.concat( subarray );
    }

    this.debug.objects.map(function( object ) {
      var points = object.map(function( segment ) {
        var x0 = segment[0],
            y0 = segment[1],
            x1 = segment[2],
            y1 = segment[3];

        // Draw segment.
        ctx.beginPath();
        ctx.moveTo( x0, y0 );
        ctx.lineTo( x1, y1 );
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f00';
        ctx.stroke();

        // Draw normals.
        var mx = 0.5 * ( x0 + x1 ),
            my = 0.5 * ( y0 + y1 );

        var normal = Utils.lineNormal( x0, y0, x1, y1 );
        ctx.beginPath();
        ctx.moveTo( mx, my );
        ctx.lineTo( mx + normal.x * 10, my + normal.y * 10 );
        ctx.strokeStyle = '#0f0';
        ctx.stroke();

        // Get intersection points.
        return circleEntities.map(function( circleEntity ) {
          var x = circleEntity.x,
              y = circleEntity.y;

          var circles = circleEntity.shapes.filter( isCircle );

          return circles.map(function( circle ) {
            return Intersection.segmentCircle( x0, y0, x1, y1, circle.x + x, circle.y + y, circle.radius );
          })[0];
        }).reduce( flatten, [] );
      }).reduce( flatten, [] );

      // Draw intersection points.
      points.forEach(function( point ) {
        ctx.beginPath();
        ctx.rect( point.x - 5, point.y - 5, 10, 10 );
        ctx.fillStyle = '#0f0';
        ctx.fill();
      });
    });
  };

  Game.prototype.tick = function() {
    if ( !this.running ) {
      return;
    }

    this.update();
    this.draw();

    window.requestAnimationFrame( this.tick.bind( this ) );
  };

  Game.prototype.add = function( entity ) {
    this.entities.push( entity );
    entity.world = this;
  };

  Game.prototype.remove = function( entity ) {
    var index = this.entities.indexOf( entity );
    if ( index !== -1 ) {
      this.entities.splice( index, 1 );
      entity.world = null;
    }
  };

  return Game;
});
