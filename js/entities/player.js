/*jshint bitwise: false*/
/*globals define*/
define([
  'box2d',
  'entities/physics-entity',
  'config/colors',
  'config/material',
  'config/settings',
  'utils'
], function( Box2D, PhysicsEntity, Colors, Material, Settings, Utils ) {
  'use strict';

  var PI2 = Utils.PI2;

  var Emotion = {
    NORMAL: 0,
    HIT: 1
  };

  function Player( x, y ) {
    PhysicsEntity.call( this, {
      shape: 'circle',
      radius: 3,
      fixture: {
        density: 0.25,
        friction: 0.5,
        restitution: 0.2,
        filter: {
          categoryBits: Material.MATTER
        }
      },
      body: {
        position: {
          x: x,
          y: y
        },
        linearDamping: 2,
        angularDamping: 0.1,
        type: 'dynamic'
      }
    });

    this.emotion = Emotion.NORMAL;
    this.emotionTimeout = null;
  }

  Player.Emotion = Emotion;

  Player.prototype = new PhysicsEntity();
  Player.prototype.constructor = Player;

  Player.prototype.draw = function( ctx ) {
    // 0.4 compensates for the difference between the drawn and fixture radii.
    // The drawn ring is at a radius of 0.35 with a maximum lineWidth of 0.18.
    // This results in a total relative width of (0.35 + 0.09) * 2 = 0.88.
    // 0.88 * 3 (physical radius) = 2.64 (draw radius).
    // Whereas:
    // 0.88 * (3 + 0.4) = 2.992, which gives some spacing.
    var radius = this.fixture.GetShape().GetRadius() + 0.4;

    var width  = 2 * radius,
        height = 2 * radius;

    ctx.save();
    ctx.translate( this.x, this.y );
    if ( this.angle ) {
      ctx.rotate( this.angle );
    }

    // Draw casing.
    ctx.lineWidth = 0.05 * width;

    // Top left.
    ctx.beginPath();
    ctx.arc( 0, 0, 0.22 * width, -Math.PI, -0.5 * Math.PI );
    ctx.strokeStyle = '#fef';
    ctx.stroke();

    // Top right.
    ctx.beginPath();
    ctx.arc( 0, 0, 0.22 * width, -0.5 * Math.PI, 0 );
    ctx.strokeStyle = '#cbe';
    ctx.stroke();

    // Bottom right.
    ctx.beginPath();
    ctx.arc( 0, 0, 0.22 * width, 0, 0.5 * Math.PI );
    ctx.strokeStyle = '#98b';
    ctx.stroke();

    // Bottom left.
    ctx.beginPath();
    ctx.arc( 0, 0, 0.22 * width, 0.5 * Math.PI, Math.PI );
    ctx.strokeStyle = '#658';
    ctx.stroke();

    // Draw main body.
    ctx.beginPath();
    ctx.arc( 0, 0, 0.2 * width, 0, PI2 );
    ctx.fillStyle = '#ecf';
    ctx.fill();

    // Strokes.
    ctx.lineWidth = 0.02 * width;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc( 0, 0, 0.18 * width, 0, PI2 );
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    if ( this.angle ) {
      ctx.save();
      ctx.rotate( -this.angle - this.game.camera.angle );
    }

    this.drawFace( ctx, width, height );

    if ( this.angle ) {
      ctx.restore();
    }

    this.drawRing( ctx, width );
  };

  Player.prototype.drawFace = function( ctx, width, height ) {
    if ( this.emotion === Emotion.NORMAL ) {
      // Draw eyes.
      ctx.beginPath();
      // Draw left eye.
      ctx.rect( -0.1 * width, -0.06 * height, 0.04 * width, 0.08 * width );
      // Draw right eye.
      ctx.rect( 0.06 * width, -0.06 * height, 0.04 * width, 0.08 * width );

      ctx.fillStyle = '#448';
      ctx.fill();

      // Draw smile.
      ctx.beginPath();
      ctx.arc( 0, 0.02 * height, 0.1 * width, 0.25 * Math.PI, 0.75 * Math.PI );

      ctx.lineWidth = 0.03 * width;
      ctx.strokeStyle = '#448';
      ctx.stroke();
    } else if ( this.emotion === Emotion.HIT ) {
      // Draw X.
      ctx.beginPath();

      // Left diagonal.
      ctx.moveTo( -0.1 * width, -0.06 * height );
      ctx.lineTo( 0.1 * width, 0.02 * height );
      // Right diagonal.
      ctx.moveTo( -0.1 * width, 0.02 * height );
      ctx.lineTo( 0.1 * width, -0.06 * height );

      ctx.lineWidth = 0.03 * width;
      ctx.strokeStyle = '#448';
      ctx.stroke();

      // Draw square.
      ctx.beginPath();
      ctx.rect( -0.02 * width, 0.08 * height, 0.04 * width, 0.04 * width );
      ctx.fillStyle = '#448';
      ctx.fill();
    }
  };

  Player.prototype.drawRing = function( ctx, width ) {
    if ( Settings.glow ) {
      ctx.globalCompositeOperation = 'lighter';
    }

    ctx.beginPath();
    ctx.arc( 0, 0, 0.35 * width, 0, PI2 );

    var glowColor = Colors.Glow[ Material.type( this.material ) ];

    if ( glowColor ) {
      ctx.lineWidth = ( 0.1 + Math.random() * 0.08 ) * width;
      ctx.strokeStyle = glowColor;
      ctx.stroke();
    }

    ctx.lineWidth = 0.07 * width;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    if ( Settings.glow ) {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  };

  Player.prototype.toggleMaterial = function() {
    this.material = this.material ^ ( Material.MATTER | Material.ANTIMATTER );
  };

  return Player;
});
