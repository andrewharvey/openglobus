og.Camera = function (options) {

    this.eye = new og.math.Vector3();
    this.u = new og.math.Vector3(); //up x n
    this.v = new og.math.Vector3(); //n x u
    this.n = new og.math.Vector3(); //eye - look
    this.aspect = 0;
    this.nearDist = 0;
    this.farDist = 0;
    this.viewAngle = 0;
    this.renderer = null;
    this.pMatrix = mat4.create();
    this.mvMatrix = mat4.create();
    this.pmvMatrix = mat4.create();
    this.ipmvMatrix = mat4.create();

    this.frustum = new og.Frustum();
    this.altitude = 0;
};

og.Camera.clone = function (cam) {
    var newcam = new og.Camera();
    newcam.eye.copy(cam.eye);
    newcam.u.copy(cam.u);
    newcam.v.copy(cam.v);
    newcam.n.copy(cam.n);
    newcam.renderer = cam.renderer;
    newcam.pMatrix.set(cam.pMatrix);
    newcam.mvMatrix.set(cam.mvMatrix);
    newcam.pmvMatrix.set(cam.pmvMatrix);
    newcam.ipmvMatrix.set(cam.ipmvMatrix);
    newcam.frustum.setFrustum(newcam.pmvMatrix);
    newcam.altitude = cam.altitude;
    return newcam;
};

og.Camera.defaultOptions = {
    viewAngle: 35,
    nearDist: 0.1,
    farDist: 1000000.0,
    eye: new og.math.Vector3(0, 0, 0),
    look: new og.math.Vector3(0, 0, 0),
    up: new og.math.Vector3(0, 1, 0)
};

og.Camera.prototype.init = function (renderer, options) {
    this.renderer = renderer;
    if (options) {
        this.setProjectionMatrix(
            options.viewAngle ? options.viewAngle : og.Camera.defaultOptions.viewAngle,
            this.renderer.ctx.gl._viewportWidth / this.renderer.ctx.gl._viewportHeight,
            options.nearDist ? options.nearDist : og.Camera.defaultOptions.nearDist,
            options.farDist ? options.farDist : og.Camera.defaultOptions.farDist);
        this.set(
            options.eye ? options.eye : og.math.Vector3.clone(og.Camera.defaultOptions.eye),
            options.look ? options.look : og.math.Vector3.clone(og.Camera.defaultOptions.look),
            options.up ? options.up : og.math.Vector3.clone(og.Camera.defaultOptions.up));
    } else {
        this.initDefaults();
    }
    this.update();
};

og.Camera.prototype.initDefaults = function () {
    this.setProjectionMatrix(
        og.Camera.defaultOptions.viewAngle,
        this.renderer.ctx.gl._viewportWidth / this.renderer.ctx.gl._viewportHeight,
        og.Camera.defaultOptions.nearDist,
        og.Camera.defaultOptions.farDist);
    this.set(
        og.math.Vector3.clone(Camera.defaultOptions.eye),
        og.math.Vector3.clone(Camera.defaultOptions.look),
        og.math.Vector3.clone(Camera.defaultOptions.up));
};

og.Camera.prototype.update = function () {
    this.setModelViewMatrix();
    mat4.multiply(this.pMatrix, this.mvMatrix, this.pmvMatrix);
    mat4.inverse(this.pmvMatrix, this.ipmvMatrix);
    this.frustum.setFrustum(this.pmvMatrix);
};

og.Camera.prototype.apply = function () {
    this.renderer.ctx.assignMatrices(this.pMatrix, this.mvMatrix);
};

og.Camera.prototype.setModelViewMatrix = function () {
    mat4.set([this.u.x, this.v.x, this.n.x, 0,
               this.u.y, this.v.y, this.n.y, 0,
               this.u.z, this.v.z, this.n.z, 0,
               -this.eye.dot(this.u), -this.eye.dot(this.v), -this.eye.dot(this.n), 1.0],
               this.mvMatrix);
};

og.Camera.prototype.refresh = function () {
    this.setProjectionMatrix(this.viewAngle, this.renderer.ctx.gl._viewportWidth / this.renderer.ctx.gl._viewportHeight, this.nearDist, this.farDist);
    this.update();
};

og.Camera.prototype.setProjectionMatrix = function (angle, aspect, near, far) {
    this.viewAngle = angle;
    this.aspect = aspect;
    this.nearDist = near;
    this.farDist = far;
    mat4.perspective(angle, aspect, near, far, this.pMatrix);
};

og.Camera.prototype.setViewAngle = function (angle) {
    this.setProjectionMatrix(angle, this.aspect, this.nearDist, this.farDist);
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
    var t = og.math.Vector3.clone(this.u);
    this.u.set(cs * t.x - sn * this.v.x, cs * t.y - sn * this.v.y, cs * t.z - sn * this.v.z);
    this.v.set(sn * t.x + cs * this.v.x, sn * t.y + cs * this.v.y, sn * t.z + cs * this.v.z);
    this.update();
};

og.Camera.prototype.pitch = function (angle) {
    var cs = Math.cos(Math.PI / 180 * angle);
    var sn = Math.sin(Math.PI / 180 * angle);
    var t = og.math.Vector3.clone(this.n);
    this.n.set(cs * t.x - sn * this.v.x, cs * t.y - sn * this.v.y, cs * t.z - sn * this.v.z);
    this.v.set(sn * t.x + cs * this.v.x, sn * t.y + cs * this.v.y, sn * t.z + cs * this.v.z);
    this.update();
};

og.Camera.prototype.yaw = function (angle) {
    var cs = Math.cos(Math.PI / 180 * angle);
    var sn = Math.sin(Math.PI / 180 * angle);
    var t = og.math.Vector3.clone(this.u);
    this.u.set(cs * t.x - sn * this.n.x, cs * t.y - sn * this.n.y, cs * t.z - sn * this.n.z);
    this.n.set(sn * t.x + cs * this.n.x, sn * t.y + cs * this.n.y, sn * t.z + cs * this.n.z);
    this.update();
};

og.Camera.prototype.unproject = function (x, y) {
    var world1 = [0, 0, 0, 0],
        world2 = [0, 0, 0, 0],
        dir = [0, 0, 0, 0],
        px = (x - this.renderer.ctx.gl._viewportWidth / 2) / (this.renderer.ctx.gl._viewportWidth / 2),
        py = -(y - this.renderer.ctx.gl._viewportHeight / 2) / (this.renderer.ctx.gl._viewportHeight / 2);

    mat4.multiplyVec4(this.ipmvMatrix, [px, py, -1, 1], world1);
    vec3.scale(world1, 1 / world1[3]);
    mat4.multiplyVec4(this.ipmvMatrix, [px, py, 0, 1], world2);
    vec3.scale(world2, 1 / world2[3]);
    vec3.subtract(world2, world1, dir);
    vec3.normalize(dir);
    return new og.math.Vector3(dir[og.math.X], dir[og.math.Y], dir[og.math.Z]);
};

og.Camera.prototype.project = function (v) {
    var r = [0, 0, 0, 1];
    mat4.multiplyVec4(this.pmvMatrix, [v[0], v[1], v[2], 1], r);
    return [(1 + r[0] / r[3]) * this.gl._viewportWidth / 2, (1 - r[1] / r[3]) * this.gl._viewportHeight / 2];
}

og.Camera.prototype.setgp = function (ellipsoid, lat, lon, alt) {
    var v = ellipsoid.LatLon2ECEF(lat, lon, (alt ? this.altitude = alt : this.altitude));
    this.eye.set(v[Y], v[Z], v[X]);
    this.update();
};

og.Camera.prototype.projectedSize = function (p) {
    return this.eye.distance(p) * Math.tan(og.math.DEG2RAD(this.viewAngle) * 0.5);
};