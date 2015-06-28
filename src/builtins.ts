import iterator = require('./iterator');
import collections = require('./collections');
import singletons = require('./singletons');
import primitives = require('./primitives');
import Py_Int = primitives.Py_Int;
import Py_Complex = primitives.Py_Complex;
import Py_Float = primitives.Py_Float;
import Py_Long = primitives.Py_Long;
import Py_List = collections.Py_List;
import Py_Dict = collections.Py_Dict;
import Py_Tuple = collections.Py_Tuple;
import Py_Set = collections.Py_Set;
import Py_Str = primitives.Py_Str;
import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import enums = require('./enums');
import Thread = require('./threading');
import IPy_FrameObj = interfaces.IPy_FrameObj;
import nativefuncobj = require('./nativefuncobject');
import Py_SyncNativeFuncObject = nativefuncobj.Py_SyncNativeFuncObject;
import Py_AsyncNativeFuncObject = nativefuncobj.Py_AsyncNativeFuncObject;

// range function
function range(t: Thread, f: IPy_FrameObj, args: Py_Int[], kwargs: Py_Dict): Py_List {
    if (kwargs.len() > 0) {
        throw new Error('TypeError: range() takes no keyword arguments')
    }
    var start = 0, step = 1, stop: number;
    switch (args.length) {
        case 1:
            stop = args[0].toNumber();
            break;

        case 2:
            start = args[0].toNumber();
            stop = args[1].toNumber();
            break;

        case 3:
            start = args[0].toNumber();
            stop = args[1].toNumber();
            step = args[2].toNumber();
            if(step === 0){
                throw new Error('ValueError: range() step argument must not be zero')
            }
            break;
        default:
            throw new Error('TypeError: range() expects 1-3 int arguments')
    }
    var it = iterator.xrange([new Py_Int(start), new Py_Int(stop), new Py_Int(step)], {});
    return Py_List.fromIterable(it);
}

// list constructor
function list(t: Thread, f: IPy_FrameObj, args: interfaces.Iterable[], kwargs: Py_Dict): Py_List {
    if (kwargs.len() > 0) {
        throw new Error('TypeError: list() takes no keyword arguments')
    }
    if (args.length == 0) {
        return new Py_List([]);
    }
    if (args.length > 1) {
        throw new Error('TypeError: list() take 0-1 arguments');
    }
    var x = args[0];
    if (x instanceof Py_List) {
      // TODO: Shouldn't TypeScript 1.4 infer the type here?
      return <Py_List> x;
    }
    return Py_List.fromIterable(x);
}

// dict constructor function
function dict(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): Py_Dict {
    // ???? apparently this is the most basic case.
    return kwargs;
}

// tuple constructor
function tuple(t: Thread, f: IPy_FrameObj, args: interfaces.Iterable[], kwargs: Py_Dict): Py_Tuple {
    if (kwargs.len() > 0) {
        throw new Error('TypeError: tuple() takes no keyword arguments')
    }
    if (args.length == 0) {
        return new Py_Tuple([]);
    }
    if (args.length > 1) {
        throw new Error('TypeError: tuple() take 0-1 arguments');
    }
    var x = args[0];
    if (x instanceof Py_Tuple) {
        return <Py_Tuple> x;
    }
    return Py_Tuple.fromIterable(x);
}

// set constructor
function set(t: Thread, f: IPy_FrameObj, args: interfaces.Iterable[], kwargs: Py_Dict): Py_Set {
    if (kwargs.len() > 0) {
        throw new Error('TypeError: set() takes no keyword arguments')
    }
    if (args.length == 0) {
        return new Py_Set();
    }
    if (args.length > 1) {
        throw new Error('TypeError: set() take 0-1 arguments');
    }
    var x = args[0];
    if (x instanceof Py_Set) {
        return <Py_Set> x;
    }
    return Py_Set.fromIterable(x);
}

function abs(t: Thread, f: IPy_FrameObj, args: interfaces.Iterable[], kwargs: Py_Dict): IPy_Object {
    return args[0].__abs__();
}

function all(x: interfaces.Iterable): typeof True {
  var it = x.iter();
  for (var val = it.next(); val != null; val = it.next()) {
    if (bool(val) === False) {
      return False;
    }
  }
  return True;
}

function any(x: interfaces.Iterable): typeof True {
  var it = x.iter();
  for (var val = it.next(); val != null; val = it.next()) {
    if (bool(val) === True) {
      return True;
    }
  }
  return False;
}

function bool(x: IPy_Object): typeof True {
  if (x.asBool) {
    return x.asBool() ? True : False;
  }
  return True;
}

function bin(x: Py_Int): Py_Str {
  // Default implementation in python adds '0b' prefix
  return Py_Str.fromJS("0b" + x.toNumber().toString(2));
}

function chr(x: Py_Int): Py_Str {
  return Py_Str.fromJS(String.fromCharCode(x.toNumber()));
}

function ord(x: IPy_Object): Py_Int {
  return new Py_Int(x.toString().charCodeAt(0));
}

function str(t: Thread, f: IPy_FrameObj, args: interfaces.Iterable[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void): void {
  if (args[0].__str__) {
    cb(args[0].__str__());
  } else {
    args[0].$__str__.exec_from_native(t, f, args, kwargs, cb); 
  }
  // TODO: Exception condition??
}

function repr(t: Thread, f: IPy_FrameObj, args: interfaces.Iterable[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void): void {
  if (args[0].__repr__) {
    cb(args[0].__repr__());
  } else {
    args[0].$__repr__.exec_from_native(t, f, args, kwargs, cb);
  }
}

function cmp(t: Thread, f: IPy_FrameObj, args: interfaces.Iterable[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void): void {
  var x = args[0];
  if (x.__eq__ && x.__lt__) {
    var y = args[1];
    if (x.__eq__(y) === True) {
      cb(new Py_Int(0));
    } else {
      cb(new Py_Int(x.__lt__(y) === True ? -1 : 1));
    }
  } else {
    x.$__eq__.exec_from_native(t, f, args, kwargs, (rv: IPy_Object) => {
      if (rv === True) {
        cb(new Py_Int(0));
      } else {
        x.$__lt__.exec_from_native(t, f, args, kwargs, (rv: IPy_Object) => {
          cb(new Py_Int(rv === True ? -1 : 1));
        });
      }
    });
  }
}

function complex(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): Py_Complex {
  if (args.length === 0) {
    return Py_Complex.fromNumber(0);
  } else if (args.length === 1) {
    return Py_Complex.fromNumber((<any> args[0]).toNumber());
  } else if (args.length === 2) {
    return new Py_Complex(<any> args[0], <any> args[1]);
  } else {
    throw new Error('TypeError: complex() takes 0-2 arguments');
  }
}

function divmod(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): IPy_Object {
  return args[0].__divmod__(args[1]);
}

function float(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): Py_Float {
  if (args.length == 0) {
    return new Py_Float(0);
  } else if (args.length == 1) {
    if (args[0] instanceof Py_Str) {
      return new Py_Float(parseFloat(args[0].toString()));
    }
    return new Py_Float((<Py_Int> args[0]).toNumber());
  } else {
    throw new Error('TypeError: float() takes 0-1 arguments');
  }
}

function hex(x: Py_Int): Py_Str {
  var n = x.toNumber();
  var ret: string;
  if (n >= 0) {
    ret = '0x' + n.toString(16);
  } else {
    ret = '-0x' + (-n).toString(16);
  }
  if (x.getType() === enums.Py_Type.LONG)
    ret += 'L';
  return Py_Str.fromJS(ret);
}

function int(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): Py_Int {
  if (kwargs.get(new Py_Str('base')) !== undefined) {
    args.push(kwargs.get(new Py_Str('base')));
  }
  switch (args.length) {
    case 0:
      return new Py_Int(0);
    case 1:
      var arg1 = args[0];
      switch(arg1.getType()) {
        case enums.Py_Type.INT:
          return <Py_Int> arg1;
        case enums.Py_Type.LONG:
        case enums.Py_Type.FLOAT:
          return new Py_Int((<Py_Long | Py_Float> arg1).toNumber() | 0);
        default:
          return new Py_Int(parseInt(arg1.toString(), 10));
      }
    case 2:
      return new Py_Int(parseInt(args[0].toString(), (<Py_Int> args[1]).toNumber()));
  }
}

// builtin iter()
function iter(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): interfaces.Iterator {
  if (kwargs.len() > 0) {
    throw new Error('TypeError: iter() takes no keyword arguments');
  }
  if (args.length == 1) {
    return (<interfaces.Iterable> args[0]).iter();
  }
  if (args.length == 2) {
    throw new Error('NotImplementedError: iter(a,b) is NYI');
  }
  throw new Error('TypeError: iter() takes 1-2 arguments');
}

function sorted(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): Py_List {
  // sorted(iterable, cmp=None, key=None, reverse=False) --> new sorted list
  if (args.length !== 1) {
    throw new Error('TypeError: sorted() takes 1 positional argument');
  }
  if (kwargs.get(new Py_Str('cmp')) !== undefined && kwargs.get(new Py_Str('cmp')) !== singletons.None) {
    throw new Error('sorted() with non-None cmp kwarg is NYI');
  }
  if (kwargs.get(new Py_Str('key')) !== undefined && kwargs.get(new Py_Str('key')) !== singletons.None) {
    throw new Error('sorted() with non-None key kwarg is NYI');
  }
  var it = (<interfaces.Iterable> args[0]).iter();
  var list: IPy_Object[] = [];
  /// XXX: Use appropriate __-prefixed iterator methods.
  for (var val = it.next(); val != null; val = it.next()) {
    list.push(val);
  }
  list.sort((a: interfaces.Iterable, b: interfaces.Iterable): number => {
    var rv: IPy_Object;
    // SUPER HACK: Requires that we take synchronous path.
    cmp(t, f, [a, b], kwargs, (_rv) => {
      rv = _rv;
    });
    return (<Py_Int> rv).toNumber();
  });
  if (kwargs.get(new Py_Str('reverse')) !== undefined && bool(kwargs.get(new Py_Str('reverse'))) === True) {
    list.reverse();
  }
  return new Py_List(list);
}

function hasattr(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): typeof True {
  if (kwargs.len() > 0) {
    throw new Error('TypeError: hasattr() takes no keyword arguments');
  }
  if (args.length != 2) {
    throw new Error('TypeError: hasattr() takes two arguments');
  }
  var obj = args[0];
  var attr = args[1].toString();
  return obj.hasOwnProperty(attr)? True : False;
}

function getattr(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): IPy_Object {
  if (kwargs.len() > 0) {
    throw new Error('TypeError: getattr() takes no keyword arguments');
  }
  if (args.length != 2) {
    throw new Error('TypeError: getattr() takes two arguments');
  }
  var obj = args[0];
  var attr = args[1].toString();
  // TODO: use __getattr__ here
  return (<any> obj)[`$${attr}`];
}

function setattr(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): IPy_Object {
  if (kwargs.len() > 0) {
    throw new Error('TypeError: setattr() takes no keyword arguments');
  }
  if (args.length != 3) {
    throw new Error('TypeError: setattr() takes three arguments');
  }
  var obj = args[0];
  var attr = args[1].toString();
  var x = args[2];
  // TODO: use __setattr__ here
  (<any> obj)[`$${attr}`] = x;
  return singletons.None;
}

function pyfunc_wrapper_onearg(func: (a: IPy_Object) => IPy_Object, funcname: string) {
  return function(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): IPy_Object {
    if (kwargs.len() > 0) {
      throw new Error('TypeError: ' + funcname +
                      '() takes no keyword arguments');
    }
    if (args.length != 1) {
      throw new Error('TypeError: ' + funcname + '() takes one argument');
    }
    return func(args[0]);
  };
}

// full mapping of builtin names to values.
var builtins = {
    True: primitives.True,
    False: primitives.False,
    None: singletons.None,
    NotImplemented: singletons.NotImplemented,
    Ellipsis: singletons.Ellipsis,
    iter: iter,
    $iter: new Py_SyncNativeFuncObject(iter),
    xrange: iterator.xrange,
    range: range,
    $range: new Py_SyncNativeFuncObject(range),
    list: list,
    $list: new Py_SyncNativeFuncObject(list),
    dict: dict,
    $dict: new Py_SyncNativeFuncObject(dict),
    tuple: tuple,
    $tuple: new Py_SyncNativeFuncObject(tuple),
    set: set,
    $set: new Py_SyncNativeFuncObject(set),
    abs: abs,
    $abs: new Py_SyncNativeFuncObject(abs),
    all: all,
    $all: new Py_SyncNativeFuncObject(pyfunc_wrapper_onearg(all, 'all')),
    any: any,
    $any: new Py_SyncNativeFuncObject(pyfunc_wrapper_onearg(any, 'any')),
    bin: bin,
    $bin: new Py_SyncNativeFuncObject(pyfunc_wrapper_onearg(bin, 'bin')),
    bool: bool,
    $bool: new Py_SyncNativeFuncObject(pyfunc_wrapper_onearg(bool, 'bool')),
    chr: chr,
    $chr: new Py_SyncNativeFuncObject(pyfunc_wrapper_onearg(chr, 'chr')),
    ord: ord,
    $ord: new Py_SyncNativeFuncObject(pyfunc_wrapper_onearg(ord, 'ord')),
    str: str,
    $str: new Py_AsyncNativeFuncObject(str),
    repr: repr,
    $repr: new Py_AsyncNativeFuncObject(repr),
    cmp: cmp,
    $cmp: new Py_AsyncNativeFuncObject(cmp),
    complex: complex,
    $complex: new Py_SyncNativeFuncObject(complex),
    divmod: divmod,
    $divmod: new Py_SyncNativeFuncObject(divmod),
    float: float,
    $float: new Py_SyncNativeFuncObject(float),
    hex: hex,
    $hex: new Py_SyncNativeFuncObject(pyfunc_wrapper_onearg(hex, 'hex')),
    int: int,
    $int: new Py_SyncNativeFuncObject(int),
    sorted: sorted,
    $sorted: new Py_SyncNativeFuncObject(sorted),
    hasattr: hasattr,
    $hasattr: new Py_SyncNativeFuncObject(hasattr),
    getattr: getattr,
    $getattr: new Py_SyncNativeFuncObject(getattr),
    setattr: setattr,
    $setattr: new Py_SyncNativeFuncObject(setattr),
    __name__: Py_Str.fromJS('__main__'),
    __package__: singletons.None,
}, True = primitives.True, False = primitives.False;

export = builtins
