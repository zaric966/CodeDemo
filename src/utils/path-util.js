/**
path.basename(path[, ext])
path.dirname(path)
path.extname(path)
path.format(pathObject)
path.isAbsolute(path)
path.join([...paths])
path.normalize(path)
path.parse(path)
path.relative(from, to)
path.resolve([...paths])
*/

/*
从github上找的一个path模块, 函数不够用需要自行增加
*/

const _sep = '/';

function _normalize(path) {
  valid(path);
  return `${path}/`
    .split(/\/+/g)
    .reduce((previous, current) => {
      if (!Array.isArray(previous)) {
        previous = [previous];
      }
      if (current === '.') {
        return previous;
      }
      if (current === '..') {
        previous.pop();
      } else if (current.length) {
        previous.push(current);
      }
      return previous;
    })
    .join('/');
}

function _basename(path, ext) {
  var basename = path.split(/\//g).pop();
  if (ext) {
    var tmp = basename.split(/\./g);
    var _ext = tmp.pop();
    if (ext === _ext || ext.slice(1) === _ext) {
      return tmp.join('.');
    }
  }
  return basename;
}

function _dirname(path) {
  // eslint-disable-next-line prettier/prettier
  return path.split(/\//g).slice(0, -1).join('/');
}

function _extname(path) {
  var tmp = path.replace(/^[\.]+/, '');
  if (/\./.test(tmp)) {
    return tmp.match(/\.[^.]*$/)[0];
  }
  return '';
}

function _format(options) {
  var { dir, root, base, name, ext } = options;
  var _dir = dir || root;
  var _base = base || `${name || ''}${/^\./.test(ext) ? '' : '.'}${ext || ''}`;
  return _normalize(`${_dir}/${_base}`);
}

function _isAbsolute(path) {
  return /^\//.test(path);
}

function _parse(path) {
  var obj = {},
    tmp;
  var components = path.split(/\//g);
  obj.base = components.pop();
  obj.dir = components.join('/');
  if (/^\//.test(obj.dir)) {
    obj.root = '/';
  }
  if (obj.base !== undefined) {
    tmp = obj.base.replace(/^[\.]+/, '');
    if (/\./.test(tmp)) {
      obj.ext = tmp.match(/\.[^.]*$/)[0];
      obj.name = obj.base.slice(0, -obj.ext.length);
    } else {
      obj.name = obj.base;
    }
  } else {
    delete obj.base;
  }
  return obj;
}

function _resolve(segments) {
  var flat = segments
    .reduce((previous, current) => {
      if (!Array.isArray(previous)) {
        previous = [previous];
      }
      if (Array.isArray(current)) {
        Array.prototype.push.apply(previous, current);
      }
      Array.prototype.push.call(previous, current);
      return previous;
    })
    .reduce((previous, current) => {
      if (/^\//.test(current)) {
        return current;
      }
      return `${previous}/${current}`;
    });
  return _normalize(flat);
}

function _relative(base, path) {
  base = base.split(/\//g);
  path = path.split(/\//g);

  while (base[0] === path[0]) {
    base.shift();
    path.shift();
  }

  return Array(base.length)
    .fill('..')
    .concat(path)
    .join('/');
}

function valid(path) {
  if (typeof path !== 'string') {
    throw new TypeError('path must be string.');
  }
}

function _addComponent(path, component) {
  valid(path);
  if (typeof component !== 'string') {
    throw new TypeError('component must be string.');
  }
  if (path[path.length] === _sep) {
    return path + component;
  } else {
    return path + _sep + component;
  }
}

function _lastComponent(pathOrUrl) {
  valid(pathOrUrl);
  if (pathOrUrl.length === 0) {
    return '';
  }
  let c = pathOrUrl.split('/');
  return c[c.length - 1];
}

module.exports = exports = {
  normalize(path) {
    return _normalize(path);
  },
  basename(path, ext) {
    return _basename(_normalize(path), ext);
  },
  dirname(path) {
    return _dirname(_normalize(path));
  },
  extname(path) {
    return _extname(_normalize(path));
  },
  format(options) {
    return _format(options);
  },
  isAbsolute(path) {
    return _isAbsolute(valid(path));
  },
  parse(path) {
    return _parse(_normalize(path));
  },
  resolve() {
    return _resolve.call({}, Array.prototype.slice.call(arguments, 0));
  },
  relative(base, path) {
    return _relative(_normalize(base), _normalize(path));
  },
  sep() {
    return _sep;
  },
  addComponent(path, component) {
    return _addComponent(path, component);
  },
  lastComponent(pathOrUrl) {
    return _lastComponent(pathOrUrl);
  },
};
