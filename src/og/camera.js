goog.provide('og.Camera');

goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og.Frustum');
goog.require('og.math.Pixel');
goog.require('og.Events');

og.Camera = function (options) {

    this.events = new og.Events();

    this.events.registerNames(["onviewchanged"]);

    this.eye = new og.math.Vector3(0, 0, 0);
    this.u = new og.math.Vector3(0, 1, 0); //up x n
    this.v = new og.math.Vector3(1, 0, 0); //n x u - UP
    this.n = new og.math.Vector3(0, 0, 1); //eye - look - FORWARD

    this.aspect = 0;
    this.nearDist = 0;
    this.farDist = 0;
    this.viewAngle = 0;
    this.renderer = null;

    this.pMatrix = new og.math.Matrix4();
    this.mvMatrix = new og.math.Matrix4();
    this.pmvMatrix = new og.math.Matrix4();
    this.ipmvMatrix = new og.math.Matrix4();
    this.frustum = new og.Frustum();

    this.pMatrixRot = new og.math.Matrix4();
    this.pmvMatrixRot = new og.math.Matrix4();

    this.altitude = 0;
};

og.Camera.clone = function (cam) {
    var newcam = new og.Camera();
    newcam.eye.copy(cam.eye);
    newcam.u.copy(cam.u);
    newcam.v.copy(cam.v);
    newcam.n.copy(cam.n);
    newcam.renderer = cam.renderer;
    newcam.pMatrix.copy(cam.pMatrix);
    newcam.mvMatrix.copy(cam.mvMatrix);
    newcam.pmvMatrix.copy(cam.pmvMatrix);
    newcam.ipmvMatrix.copy(cam.ipmvMatrix);
    newcam.frustum.setFrustum(newcam.pmvMatrix);
    newcam.altitude = cam.altitude;
    return newcam;
};

og.Camera.defaultOptions = {
    viewAngle: 35,
    nearDist: 0.1,
    farDist: 10000,
    eye: new og.math.Vector3(0, 0, 0),
    look: new og.math.Vector3(0, 0, 0),
    up: new og.math.Vector3(0, 1, 0)
};

og.Camera.prototype.init = function (renderer, options) {
    this.renderer = renderer;
    if (options) {
        this.setProjectionMatrix(
            options.viewAngle ? options.viewAngle : og.Camera.defaultOptions.viewAngle,
            this.renderer.handler.gl.canvas.aspect,
            options.nearDist ? options.nearDist : og.Camera.defaultOptions.nearDist,
            options.farDist ? options.farDist : og.Camera.defaultOptions.farDist);
        this.set(
            options.eye ? options.eye : og.Camera.defaultOptions.eye.clone(),
            options.look ? options.look : og.Camera.defaultOptions.look.clone(),
            options.up ? options.up : og.Camera.defaultOptions.up.clone());
    } else {
        this.initDefaults();
    }

    this.update();
};

og.Camera.prototype.initDefaults = function () {
    this.setProjectionMatrix(
        og.Camera.defaultOptions.viewAngle,
        this.renderer.handler.gl.canvas.aspect,
        og.Camera.defaultOptions.nearDist,
        og.Camera.defaultOptions.farDist);
    this.set(
        Camera.defaultOptions.eye.clone(),
        Camera.defaultOptions.look.clone(),
        Camera.defaultOptions.up.clone());
};

og.Camera.prototype.update = function () {
    this.setModelViewMatrix();
    this.pmvMatrix = this.pMatrix.mul(this.mvMatrix);
    this.frustum.setFrustum(this.pmvMatrix._m);

    this.pmvMatrixRot = this.pMatrixRot.mul(this.mvMatrix);
    this.ipmvMatrix = this.pmvMatrixRot.inverse();
    this.events.dispatch(this.events.onviewchanged, this);
};

og.Camera.prototype.setModelViewMatrix = function () {
    this.mvMatrix.set([this.u.x, this.v.x, this.n.x, 0,
                       this.u.y, this.v.y, this.n.y, 0,
                       this.u.z, this.v.z, this.n.z, 0,
                       -this.eye.dot(this.u), -this.eye.dot(this.v), -this.eye.dot(this.n), 1.0]);
};

og.Camera.prototype.refresh = function () {
    this.setProjectionMatrix(this.viewAngle, this.renderer.handler.gl.canvas.aspect, this.nearDist, this.farDist);
    this.update();
};

og.Camera.prototype.setFarVisibilityDistance = function (distance) {
    this.farDist = distance;
    this.refresh();
};

og.Camera.prototype.setNearVisibilityDistance = function (distance) {
    this.nearDist = distance;
    this.refresh();
};

og.Camera.prototype.setNearPointVisibility = function (near, distance) {
    this.nearDist = near;
    if (distance) {
        this.farDist = near + distance;
    } else {
        this.farDist = near + this.farDist - this.nearDist;
    }
    this.refresh();
};

og.Camera.prototype.setProjectionMatrix = function (angle, aspect, near, far) {
    this.viewAngle = angle;
    this.aspect = aspect;
    this.nearDist = near;
    this.farDist = far;
    this.pMatrix.setPerspective(angle, aspect, near, far);
    this.pMatrixRot.setPerspective(angle, aspect, 1, 10000);
};

og.Camera.prototype.setViewAngle = function (angle) {
    this.viewAngle = angle;
    this.refresh();
};

og.Camera.prototype.set = function (Eye, look, up) {
    this.eye.copy(Eye);
    this.n.set(Eye.x - look.x, Eye.y - look.y, Eye.z - look.z);
    this.u.copy(up.cross(this.n));
    this.n.normalize(); this.u.normalize();
    this.v.copy(this.n.cross(this.u));
    this.update();
};

og.Camera.prototype.look = function (look, up) {
    this.n.set(this.eye.x - look.x, this.eye.y - look.y, this.eye.z - look.z);
    this.u.copy((up ? up : this.v).cross(this.n));
    this.n.normalize(); this.u.normalize();
    this.v.copy(this.n.cross(this.u));
    this.update();
};

og.Camera.prototype.slide = function (du, dv, dn) {
    this.eye.x += du * this.u.x + dv * this.v.x + dn * this.n.x;
    this.eye.y += du * this.u.y + dv * this.v.y + dn * this.n.y;
    this.eye.z += du * this.u.z + dv * this.v.z + dn * this.n.z;
    this.update();
};

og.Camera.prototype.roll = function (angle) {
    var cs = Math.cos(Math.PI / 180 * angle);
    var sn = Math.sin(Math.PI / 180 * angle);
    var t = this.u.clone();
    this.u.set(cs * t.x - sn * this.v.x, cs * t.y - sn * this.v.y, cs * t.z - sn * this.v.z);
    this.v.set(sn * t.x + cs * this.v.x, sn * t.y + cs * this.v.y, sn * t.z + cs * this.v.z);
    this.update();
};

og.Camera.prototype.pitch = function (angle) {
    var cs = Math.cos(Math.PI / 180 * angle);
    var sn = Math.sin(Math.PI / 180 * angle);
    var t = this.n.clone();
    this.n.set(cs * t.x - sn * this.v.x, cs * t.y - sn * this.v.y, cs * t.z - sn * this.v.z);
    this.v.set(sn * t.x + cs * this.v.x, sn * t.y + cs * this.v.y, sn * t.z + cs * this.v.z);
    this.update();
};

og.Camera.prototype.yaw = function (angle) {
    var cs = Math.cos(Math.PI / 180 * angle);
    var sn = Math.sin(Math.PI / 180 * angle);
    var t = this.u.clone();
    this.u.set(cs * t.x - sn * this.n.x, cs * t.y - sn * this.n.y, cs * t.z - sn * this.n.z);
    this.n.set(sn * t.x + cs * this.n.x, sn * t.y + cs * this.n.y, sn * t.z + cs * this.n.z);
    this.update();
};

og.Camera.prototype.unproject = function (x, y) {
    var px = (x - this.renderer.handler.gl.canvas.width / 2) / (this.renderer.handler.gl.canvas.width / 2),
        py = -(y - this.renderer.handler.gl.canvas.height / 2) / (this.renderer.handler.gl.canvas.height / 2);

    var world1 = this.ipmvMatrix.mulVec4(new og.math.Vector4(px, py, -1, 1)).affinity(),
        world2 = this.ipmvMatrix.mulVec4(new og.math.Vector4(px, py, 0, 1)).affinity();

    return world2.sub(world1).toVector3().normalize();
};

og.Camera.prototype.project = function (v) {
    var r = this.pmvMatrix.mulVec4(v.toVector4());
    return new og.math.Pixel((1 + r.x / r.w) * this.gl.canvas.width / 2, (1 - r.y / r.w) * this.gl.canvas.height / 2);
};

og.Camera.prototype.setgp = function (ellipsoid, lonlat) {
    this.altitude = lonlat.height;
    this.eye = ellipsoid.LonLat2ECEF(lonlat);
    this.update();
};

og.Camera.prototype.projectedSize = function (p) {
    return this.eye.distance(p) * Math.tan(og.math.DEG2RAD(this.viewAngle) * 0.5);
};

og.Camera.prototype.getExtentPosition = function (extent, ellipsoid) {

    var north = extent.getNorth();
    var south = extent.getSouth();
    var east = extent.getEast();
    var west = extent.getWest();

    if (west > east) {
        east += 360;
    }

    var cart = new og.LonLat(east, north);
    var northEast = ellipsoid.LonLat2ECEF(cart);
    cart.lat = south;
    var southEast = ellipsoid.LonLat2ECEF(cart);
    cart.lon = west;
    var southWest = ellipsoid.LonLat2ECEF(cart);
    cart.lat = north;
    var northWest = ellipsoid.LonLat2ECEF(cart);

    var center = og.math.Vector3.sub(northEast, southWest).scale(0.5).add(southWest);

    var mag = center.length();
    if (mag < 0.000001) {
        cart.lon = (east + west) * 0.5;
        cart.lat = (north + south) * 0.5;
        center = ellipsoid.LonLat2ECEF(cart);
    }

    northWest.sub(center);
    southEast.sub(center);
    northEast.sub(center);
    southWest.sub(center);

    var direction = center.normal();//ellipsoid.getSurfaceNormal(center).negate().normalize();
    var right = direction.cross(og.math.Vector3.UP).normalize();
    var up = right.cross(direction).normalize();

    var height = Math.max(
      Math.abs(up.dot(northWest)),
      Math.abs(up.dot(southEast)),
      Math.abs(up.dot(northEast)),
      Math.abs(up.dot(southWest))
    );

    var width = Math.max(
      Math.abs(right.dot(northWest)),
      Math.abs(right.dot(southEast)),
      Math.abs(right.dot(northEast)),
      Math.abs(right.dot(southWest))
    );

    var tanPhi = Math.tan(this.viewAngle * og.math.RADIANS * 0.5);
    var tanTheta = this.aspect * tanPhi;
    var d = Math.max(width / tanTheta, height / tanPhi);

    center.normalize();
    center.scale(mag + d);
    return center;
};