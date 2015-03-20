import primitives = require('./primitives');
import Py_FrameObject = require('./frameobject');
import Py_Int = primitives.Py_Int;
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import builtins = require('./builtins');
import collections = require('./collections');
import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import Py_List = collections.Py_List;
import Py_Tuple = collections.Py_Tuple;
import Py_Set = collections.Py_Set;
import Py_Dict = collections.Py_Dict;
import Py_CodeObject = require('./codeobject');
import enums = require('./enums');
import singletons = require('./singletons');
import True = primitives.True;
import False = primitives.False;
import Iterator = interfaces.Iterator;
import Iterable = interfaces.Iterable;
import Py_Slice = collections.Py_Slice;
import None = singletons.None;
import Py_Cell = require('./cell');
var NotImplemented = builtins.NotImplemented;

// XXX: Copy+paste of builtins.bool.
function bool(x: IPy_Object): typeof True {
  if (typeof(x) === 'object' && x.asBool) {
    return x.asBool() ? True : False;
  }
  return True;
}

// Big mapping from opcode enum to function
var optable: { [op: number]: (f: Py_FrameObject)=>void } = {};

optable[opcodes.STOP_CODE] = function(f: Py_FrameObject) {
    throw new Error("Indicates end-of-code to the compiler, not used by the interpreter.");
}

optable[opcodes.POP_TOP] = function(f: Py_FrameObject) {
    f.pop();
}

optable[opcodes.ROT_TWO] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    f.push(a);
    f.push(b);
}

optable[opcodes.ROT_THREE] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    f.push(a);
    f.push(c);
    f.push(b);
}

optable[opcodes.ROT_FOUR] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    var d = f.pop();
    f.push(a);
    f.push(d);
    f.push(c);
    f.push(b);
}

optable[opcodes.UNARY_POSITIVE] = function(f: Py_FrameObject) {
  var a = f.pop();
  if (a.__pos__)
    f.push(a.__pos__());
  else
    throw new Error("No unary_+ for " + a);
}

optable[opcodes.UNARY_NEGATIVE] = function(f: Py_FrameObject) {
    var a = f.pop();

    if (a.__neg__)
        f.push(a.__neg__());
    else
        throw new Error("No unary_- for " + a);
}

optable[opcodes.UNARY_NOT] = function(f: Py_FrameObject) {
    var a = f.pop();
    f.push(bool(a) === True ? False : True);
}

optable[opcodes.UNARY_CONVERT] = function(f: Py_FrameObject) {
    var a = f.pop();
    f.push(a.__repr__());
}

optable[opcodes.UNARY_INVERT] = function(f: Py_FrameObject) {
    var a = f.pop();

    if (a.__invert__)
        f.push(a.__invert__());
    else
        throw new Error("No inversion function for " + a);
}

// All of the binary functions follow the same chain of logic:
// 1. There is some function for each object that defines this operation
//    (e.g. addition is implemented by the "add" function)
// 2. Operations that are not supported for a particular type (e.g. binary
//    AND or shifts for non-integers) are left undefined.
// 3. If a particular operation is not defined for the given arguments,
//    the function will return the NotImplemented.
// 4. If this is the case, try the reverse operation (rop) function
// 5. If rop is similarly undefined or returns NotImplemented, the
//    operation is not permitted for the given types.
function binary_op(f: Py_FrameObject, op: string, inplace: boolean) {
    // TODO: use this to generate code
    var b = f.pop();
    var a = f.pop();
    var res: IPy_Object;

    if (inplace && a[`__i${op}__`] !== undefined) {
        a[`__i${op}__`](b);
        f.push(a);
        return;
    }
    if (a[`__${op}__`] === undefined) {
        throw new Error(`TypeError: cannot __${op}__ ${a} and ${b}`);
    }
    res = a[`__${op}__`](b);
    if (!inplace && res == NotImplemented) {
        if (b[`__r${op}__`] === 'undefined') {
            throw new Error(`TypeError: cannot __${op}__ ${a} and ${b}`);
        }
        res = b[`__r${op}__`](a);
    }
    if (res == NotImplemented) {
        throw new Error(`TypeError: cannot __${op}__ ${a} and ${b}`);
    }
    f.push(res);
}

optable[opcodes.BINARY_POWER] = (f: Py_FrameObject) => binary_op(f, 'pow', false);
optable[opcodes.INPLACE_POWER] = (f: Py_FrameObject) => binary_op(f, 'pow', true);
optable[opcodes.BINARY_MULTIPLY] = (f: Py_FrameObject) => binary_op(f, 'mul', false);
optable[opcodes.INPLACE_MULTIPLY] = (f: Py_FrameObject) => binary_op(f, 'mul', true);
optable[opcodes.BINARY_DIVIDE] = (f: Py_FrameObject) => binary_op(f, 'div', false);
optable[opcodes.INPLACE_DIVIDE] = (f: Py_FrameObject) => binary_op(f, 'div', true);
optable[opcodes.BINARY_MODULO] = (f: Py_FrameObject) => binary_op(f, 'mod', false);
optable[opcodes.INPLACE_MODULO] = (f: Py_FrameObject) => binary_op(f, 'mod', true);
optable[opcodes.BINARY_ADD] = (f: Py_FrameObject) => binary_op(f, 'add', false);
optable[opcodes.INPLACE_ADD] = (f: Py_FrameObject) => binary_op(f, 'add', true);
optable[opcodes.BINARY_SUBTRACT] = (f: Py_FrameObject) => binary_op(f, 'sub', false);
optable[opcodes.INPLACE_SUBTRACT] = (f: Py_FrameObject) => binary_op(f, 'sub', true);
optable[opcodes.BINARY_FLOOR_DIVIDE] = (f: Py_FrameObject) => binary_op(f, 'floordiv', false);
optable[opcodes.INPLACE_FLOOR_DIVIDE] = (f: Py_FrameObject) => binary_op(f, 'floordiv', true);
optable[opcodes.BINARY_TRUE_DIVIDE] = (f: Py_FrameObject) => binary_op(f, 'truediv', false);
optable[opcodes.INPLACE_TRUE_DIVIDE] = (f: Py_FrameObject) => binary_op(f, 'truediv', true);
optable[opcodes.BINARY_LSHIFT] = (f: Py_FrameObject) => binary_op(f, 'lshift', false);
optable[opcodes.INPLACE_LSHIFT] = (f: Py_FrameObject) => binary_op(f, 'lshift', true);
optable[opcodes.BINARY_RSHIFT] = (f: Py_FrameObject) => binary_op(f, 'rshift', false);
optable[opcodes.INPLACE_RSHIFT] = (f: Py_FrameObject) => binary_op(f, 'rshift', true);
optable[opcodes.BINARY_AND] = (f: Py_FrameObject) => binary_op(f, 'and', false);
optable[opcodes.INPLACE_AND] = (f: Py_FrameObject) => binary_op(f, 'and', true);
optable[opcodes.BINARY_XOR] = (f: Py_FrameObject) => binary_op(f, 'xor', false);
optable[opcodes.INPLACE_XOR] = (f: Py_FrameObject) => binary_op(f, 'xor', true);
optable[opcodes.BINARY_OR] = (f: Py_FrameObject) => binary_op(f, 'or', false);
optable[opcodes.INPLACE_OR] = (f: Py_FrameObject) => binary_op(f, 'or', true);

optable[opcodes.BINARY_SUBSCR] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();
    if (a.__getitem__) {
      f.push(a.__getitem__(b));
    }
}

optable[opcodes.PRINT_ITEM] = function(f: Py_FrameObject) {
    var a = f.pop();
    // see https://docs.python.org/2/reference/simple_stmts.html#print
    if (f.shouldWriteSpace) {
        f.outputDevice.write(' ');
    }
    var s: string = a.__str__().toString();
    f.outputDevice.write(s);
    var lastChar = s.slice(-1);
    f.shouldWriteSpace = (lastChar != '\t' && lastChar != '\n');
}

optable[opcodes.PRINT_NEWLINE] = function(f: Py_FrameObject) {
    f.outputDevice.write("\n");
    f.shouldWriteSpace = false;
}

optable[opcodes.RETURN_VALUE] = function(f: Py_FrameObject) {
    var r = f.pop();
    if (f.back) {
      f.back.push(r);
    }
    return r;
}

optable[opcodes.STORE_NAME] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    var name = f.codeObj.names[i];
    f.locals[name.toString()] = val;
}

optable[opcodes.DELETE_NAME] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.names[i];
    delete f.locals[name.toString()]
}

optable[opcodes.STORE_ATTR] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var obj = f.pop();
    var attr = f.pop();
    var name = f.codeObj.names[i];
    // TODO: use __setattr__ here
    obj[name.toString()] = attr;
}

optable[opcodes.DELETE_ATTR] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var obj = f.pop();
    var name = f.codeObj.names[i];
    // TODO: use __delattr__ here
    delete obj[name.toString()];
}

optable[opcodes.UNPACK_SEQUENCE] = function(f: Py_FrameObject) {
    var val = f.pop();
    if(val.__getitem__ === undefined) {
        throw new Error("Expected a list or tuple type.");
    }
    // Pop from stack, and reverse the order of elements, and push back into stack
    // e.g. 1 2 3 -> 3 2 1
    for (var i = f.readArg()-1; i >= 0; i--)
    {
        f.push(val.__getitem__(new Py_Int(i)));
    }
}

optable[opcodes.STORE_GLOBAL] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    var name = f.codeObj.names[i];
    f.globals[name.toString()] = val;
}

optable[opcodes.DELETE_GLOBAL] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.names[i];
    delete f.globals[name.toString()];
}

optable[opcodes.LOAD_CONST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    f.push(f.codeObj.consts[i]);
}

optable[opcodes.LOAD_NAME] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name: string = f.codeObj.names[i].toString();
    var val = f.locals[name] || f.globals[name] || builtins[name];
    if (val === undefined) {
        throw new Error('undefined name: ' + name);
    }
    f.push(val);
}

optable[opcodes.LOAD_GLOBAL] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name: string = f.codeObj.names[i].toString();
    var val = f.globals[name] || builtins[name];
    if (val === undefined) {
        throw new Error('undefined name: ' + name);
    }
    f.push(val);
}

optable[opcodes.LOAD_DEREF] = function(f: Py_FrameObject) {
    var i = f.readArg();
    f.push(f.getDeref(i).ob_ref);
}

optable[opcodes.STORE_DEREF] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var obj = f.pop();
    f.env[i].ob_ref = obj;
}

optable[opcodes.LOAD_CLOSURE] = function(f: Py_FrameObject) {
    var i = f.readArg();
    f.push(f.getDeref(i));
}

optable[opcodes.COMPARE_OP] = function(f: Py_FrameObject) {
    var comp_ops = ['<', '<=', '==', '!=', '>', '>=', 'in', 'not in',
                    'is', 'is not', 'exception match'];
    var opidx = f.readArg();
    var op = comp_ops[opidx];
    var b = f.pop();
    var a = f.pop();

    switch(op) {
        case '<':
            f.push(doLT(a,b));
            break;
        case '<=':
            f.push(doLE(a,b));
            break;
        case '==':
            f.push(doEQ(a,b));
            break;
        case '!=':
            f.push(doNE(a,b));
            break;
        case '>':
            f.push(doGT(a,b));
            break;
        case '>=':
            f.push(doGE(a,b));
            break;
            // Comparisons of sequences and types are not implemented
        // case 'in':
        //     return b.some( function(elem, idx, arr) {
        //         return elem == a;
        //     });
        //     break;
        // case 'not in':
        //     return b.every( function(elem, idx, arr) {
        //         return elem != a;
        //     });
        //     break;
        case 'is':
            f.push(a.hash() === b.hash() ? True : False);
            break;
        case 'is not':
            f.push(a.hash() !== b.hash() ? True : False);
            break;
        // case 'exception match':
        //     throw new Error("Python Exceptions are not supported");
        default:
            throw new Error("Unknown or unsupported comparison operator: "+op);
    }
}

function doLT(a: IPy_Object, b: IPy_Object): IPy_Object {
    var res;
    var mess = "There is no less-than ordering between " + a + " and " + b;

    if (typeof a.__lt__ == 'undefined')
        throw new Error(mess);

    res = a.__lt__(b);
    if (res == NotImplemented) {
        if(typeof b.__gt__ == 'undefined')
            throw new Error(mess);
        res = b.__gt__(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doLE(a: IPy_Object, b: IPy_Object): IPy_Object {
    var res;
    var mess = "There is no '<=' (LTE) ordering between " + a + " and " + b;

    if (typeof a.__le__ == 'undefined')
        throw new Error(mess);

    res = a.__le__(b);
    if (res === NotImplemented) {
        if(typeof b.__ge__ == 'undefined')
            throw new Error(mess);
        res = b.__ge__(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doEQ(a: IPy_Object, b: IPy_Object): IPy_Object {
    var res;
    var mess = "There is no equality operation between " + a + " and " + b;

    if (typeof a.__eq__ == 'undefined')
        throw new Error(mess);

    res = a.__eq__(b);
    if (res === NotImplemented) {
        if(typeof b.__eq__ == 'undefined')
            throw new Error(mess);
        res = b.__eq__(a);
        if (res === NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doNE(a: IPy_Object, b: IPy_Object): IPy_Object {
    var res;
    var mess = "There is no inequality operation between "+ a + " and " + b;

    if (typeof a.__ne__ === 'undefined')
        throw new Error(mess);

    res = a.__ne__(b);
    if (res === NotImplemented) {
        if(typeof b.__ne__ == 'undefined')
            throw new Error(mess);
        res = b.__ne__(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doGT(a: IPy_Object, b: IPy_Object): IPy_Object {
    var res;
    var mess = "There is no greater-than ordering between "+ a +" and " + b;

    if (typeof a.__gt__ == 'undefined')
        throw new Error(mess);

    res = a.__gt__(b);
    if (res == NotImplemented) {
        if(typeof b.__lt__ == 'undefined')
            throw new Error(mess);
        res = b.__lt__(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doGE(a: IPy_Object, b: IPy_Object): IPy_Object {
    var res;
    var mess = "There is no >= (GTE) ordering between "+ a + " and " + b;

    if (typeof a.__ge__ == 'undefined')
        throw new Error(mess);

    res = a.__ge__(b);
    if (res == NotImplemented) {
        if(typeof b.__le__ == 'undefined')
            throw new Error(mess);
        res = b.__le__(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

optable[opcodes.JUMP_FORWARD] = function(f: Py_FrameObject) {
    var delta = f.readArg();
    f.lastInst += delta
}

optable[opcodes.JUMP_IF_FALSE_OR_POP] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (bool(f.peek()) === True) {
        f.pop();
    } else {
        f.lastInst = target-1;
    }
}

optable[opcodes.JUMP_IF_TRUE_OR_POP] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (bool(f.peek()) === True) {
        f.lastInst = target-1;
    } else {
        f.pop();
    }
}

optable[opcodes.JUMP_ABSOLUTE] = function(f: Py_FrameObject) {
    var target = f.readArg();
    f.lastInst = target - 1;  // XXX: readOp increments before reading
}

optable[opcodes.POP_JUMP_IF_FALSE] = function(f: Py_FrameObject) {
    var target = f.readArg();

    if (bool(f.pop()) === False)
        f.lastInst = target-1;
}

optable[opcodes.POP_JUMP_IF_TRUE] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (bool(f.pop()) === True)
        f.lastInst = target-1;
}

optable[opcodes.LOAD_FAST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.varnames[i].toString();
    f.push(f.locals[name]);
}

optable[opcodes.STORE_FAST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    f.locals[f.codeObj.varnames[i].toString()] = val;
}

optable[opcodes.DELETE_FAST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    delete f.locals[f.codeObj.varnames[i].toString()];
}

// Helper function for all the CALL_FUNCTION* opcodes
function call_func(f: Py_FrameObject, has_kw: boolean, has_varargs: boolean) {
    var x = f.readArg();
    var num_args = x & 0xff;
    var num_kwargs = (x >> 8) & 0xff;
    var args = new Array(num_args);
    var kwargs: { [name: string]: IPy_Object } = {};

    if (has_kw) {
        var kw = (<Py_Dict> f.pop()).toPairs();
    }
    if (has_varargs) {
        var varargs = (<Py_Tuple> f.pop()).toArray();
    }

    for (var i = 0; i < num_kwargs; i++) {
        var val = f.pop();
        var key = f.pop();
        kwargs[key.toString()] = val;
    }

    // positional args come in backwards (stack) order
    for (var i = num_args-1; i >= 0; i--) {
        args[i] = f.pop();
    }

    if (has_kw) {
        for (var i = 0; i < kw.length; i++) {
           var item = kw[i];
           kwargs[item[0].toString()] = item[1];
        }
    }
    if (has_varargs) {
        Array.prototype.push.apply(args, varargs);
    }
    var func = f.pop();

    // Hacky check for native functions
    if (typeof func === 'function') {
        // XXX: not async! Any async native will kill the interpreter.
        f.push((<any> func)(args, kwargs));
    } else if (func instanceof Py_FuncObject) {
        // convert kwargs into local variables for the function
        var varnames = (<Py_FuncObject> func).code.varnames;
        for (var i = 0; i < varnames.length; i++) {
            var name = varnames[i].toString();
            if (kwargs[name] == undefined) {
                if (args.length > 0) {
                    kwargs[name] = args.shift();
                } else {
                    kwargs[name] = (<Py_FuncObject> func).defaults[name];
                }
            }
        }

        var newf = f.childFrame((<Py_FuncObject> func), kwargs);
        newf.exec();
    } else {
      throw new Error("Invalid object.");
    }
}

optable[opcodes.CALL_FUNCTION] = function(f: Py_FrameObject) {
    call_func(f, false, false);
}

optable[opcodes.CALL_FUNCTION_VAR] = function(f: Py_FrameObject) {
    call_func(f, false, true);
}

optable[opcodes.CALL_FUNCTION_KW] = function(f: Py_FrameObject) {
    call_func(f, true, false);
}

optable[opcodes.CALL_FUNCTION_VAR_KW] = function(f: Py_FrameObject) {
    call_func(f, true, true);
}

optable[opcodes.MAKE_FUNCTION] = function(f: Py_FrameObject) {
    var numDefault = f.readArg();
    var defaults: { [name: string]: any } = {};

    var code = <Py_CodeObject> f.pop();
    for (var i = code.argcount-1; i >= code.argcount - numDefault; i--) {
        defaults[code.varnames[i].toString()] = f.pop();
    }

    var func = new Py_FuncObject(code, f.globals, defaults, code.name);
    f.push(func);
}

optable[opcodes.MAKE_CLOSURE] = function(f: Py_FrameObject) {
    var numDefault = f.readArg();
    var defaults: { [name: string]: any } = {};

    var code = <Py_CodeObject> f.pop();
    var freevars = <Py_Tuple> f.pop();
    for (var i = code.argcount-1; i >= code.argcount - numDefault; i--) {
        defaults[code.varnames[i].toString()] = f.pop();
    }

    var func = new Py_FuncObject(code, f.globals, defaults, code.name);
    func.closure = freevars;
    f.push(func);
}

optable[opcodes.DUP_TOP] = function(f: Py_FrameObject) {
    f.push(f.peek());
}

optable[opcodes.NOP] = function(f: Py_FrameObject) {}

optable[opcodes.SLICE_0] = function(f: Py_FrameObject) {
    var a = f.pop();
    if (a.__getitem__) {
      f.push(a.__getitem__(new Py_Slice(new Py_Int(0), a.__len__(), None)));
    } else {
      throw new Error("Unsupported type.");
    }
}

optable[opcodes.SLICE_1] = function(f: Py_FrameObject) {
  var a = f.pop();
  var b = f.pop();
  if (b.__getitem__) {
    f.push(b.__getitem__(new Py_Slice(a, b.__len__(), None)));
  } else {
    throw new Error("Wrong type.");
  }
}

optable[opcodes.SLICE_2] = function(f: Py_FrameObject) {
  var a = f.pop();
  var b = f.pop();
  if (b.__getitem__) {
    f.push(b.__getitem__(new Py_Slice(new Py_Int(0), a, None)));
  } else {
    throw new Error("Wrong type.");
  }
}

optable[opcodes.SLICE_3] = function(f: Py_FrameObject) {
  var a = f.pop();
  var b = f.pop();
  var c = f.pop();
  if (c.__getitem__) {
    f.push(c.__getitem__(new Py_Slice(b, a, None)));
  } else {
    throw new Error("Wrong type.");
  }
}

optable[opcodes.STORE_SLICE_0] = function(f: Py_FrameObject) {
  var seq = f.pop();
  var value = <Iterable> f.pop();
  if (seq.__setitem__) {
    seq.__setitem__(new Py_Slice(None, None, None), value);
  } else {
    throw new Error("Unsupported type.");
  }
}

optable[opcodes.STORE_SLICE_1] = function(f: Py_FrameObject) {
  var start = f.pop();
  var seq = f.pop();
  var value = <Iterable> f.pop();
  if (seq.__setitem__) {
    seq.__setitem__(new Py_Slice(start, None, None), value);
  } else {
    throw new Error("Unsupported type.");
  }
}

optable[opcodes.STORE_SLICE_2] = function(f: Py_FrameObject) {
  var end = f.pop();
  var seq = <Py_List> f.pop();
  var value = <Iterable> f.pop();
  if (seq.__setitem__) {
    seq.__setitem__(new Py_Slice(None, end, None), value);
  } else {
    throw new Error("Unsupported type.");
  }
}

optable[opcodes.STORE_SLICE_3] = function(f: Py_FrameObject) {
  var end = f.pop();
  var start = f.pop();
  var seq = <Py_List> f.pop();
  var value = <Iterable> f.pop();
  if (seq.__setitem__) {
    seq.__setitem__(new Py_Slice(start, end, None), value);
  } else {
    throw new Error("Unsupported type.");
  }
}

optable[opcodes.DELETE_SLICE_0] = function(f: Py_FrameObject) {
  var seq = f.pop();
  if (seq.__delitem__) {
    seq.__delitem__(new Py_Slice(None, None, None));
  } else {
    throw new Error("Unsupported type.");
  }
}

optable[opcodes.DELETE_SLICE_1] = function(f: Py_FrameObject) {
  var start = f.pop();
  var seq = f.pop();
  if (seq.__delitem__) {
    seq.__delitem__(new Py_Slice(start, None, None));
  } else {
    throw new Error("Unsupported type.");
  }
}

optable[opcodes.DELETE_SLICE_2] = function(f: Py_FrameObject) {
  var end = f.pop();
  var seq = <Py_List> f.pop();
  if (seq.__delitem__) {
    seq.__delitem__(new Py_Slice(None, end, None));
  } else {
    throw new Error("Unsupported type.");
  }
}

optable[opcodes.DELETE_SLICE_3] = function(f: Py_FrameObject) {
  var end = f.pop();
  var start = f.pop();
  var seq = <Py_List> f.pop();
  if (seq.__delitem__) {
    seq.__delitem__(new Py_Slice(start, end, None));
  } else {
    throw new Error("Unsupported type.");
  }
}


// TODO: more testing
optable[opcodes.STORE_SUBSCR] = function(f: Py_FrameObject) {
  var key = <any> f.pop();
  var obj = <any> f.pop();
  var value = f.pop();
  if (obj.__setitem__) {
    obj.__setitem__(key, value);
  } else {
    throw new Error("Unsupported type.");
  }
}

// TODO: more testing
optable[opcodes.DELETE_SUBSCR] = function(f: Py_FrameObject) {
    var key = f.pop();
    var obj = <any> f.pop();
    if (obj.__delitem__) {
        obj.__delitem__(key);
    } else {
        throw new Error("Unsupported type.");
    }
}

optable[opcodes.BUILD_TUPLE] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var l = new Array(count);
    for (var i = count-1; i >= 0; i--){
        l[i] = f.pop();
    }
    f.push(new Py_Tuple(l));
}

optable[opcodes.BUILD_LIST] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var l = new Array(count);
    for (var i = count-1; i >= 0; i--){
        l[i] = f.pop();
    }
    f.push(new Py_List(l));
}

optable[opcodes.BUILD_SET] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var l = new Array(count);
    for (var i = count-1; i >= 0; i--){
        l[i] = f.pop();
    }
    // XXX: not the smartest way to build a set...
    f.push(Py_Set.fromIterable(new Py_List(l)));
}

optable[opcodes.BUILD_MAP] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var d = builtins.dict([], {});
    f.push(d);
}

optable[opcodes.STORE_MAP] = function(f: Py_FrameObject) {
    var key = f.pop();
    var val = f.pop();
    var d = <Py_Dict> f.peek();
    d.set(key, val);
}

function setup_block(f: Py_FrameObject) {
    var delta = f.readArg();
    // push a block to the block stack
    var stackSize = f.stack.length;
    var loopPos = f.lastInst;
    f.blockStack.push([stackSize, loopPos, loopPos+delta]);
}
optable[opcodes.SETUP_LOOP] = setup_block;
optable[opcodes.SETUP_EXCEPT] = setup_block;
optable[opcodes.SETUP_FINALLY] = setup_block;

optable[opcodes.BREAK_LOOP] = function(f: Py_FrameObject) {
    var b = f.blockStack.pop();
    // Entries are [stackSize, startPos, endPos] tuples.
    var stackSize: number = b[0];
    var endPos: number = b[2];
    // unwind the stack to clear loop variables
    f.stack.splice(stackSize, f.stack.length - stackSize);
    // jump to the end of the loop
    f.lastInst = endPos;
}

optable[opcodes.CONTINUE_LOOP] = function(f: Py_FrameObject) {
    var target = f.readArg();
    var b = f.blockStack[f.blockStack.length-1];
    if (b[1] === target) {
        // we continue back to the loop start
        f.lastInst = target-1;
    } else {
        // unwind and jump to block end (as with BREAK_LOOP, but doesn't pop)
        f.stack.splice(b[0], f.stack.length - b[0]);
        f.lastInst = b[2];
    }
}

optable[opcodes.LIST_APPEND] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var x = f.pop();
    var lst = <Py_List> f.stack[f.stack.length - i];
    lst.append([x], {});
}

optable[opcodes.END_FINALLY] = function(f: Py_FrameObject) {
    // TODO: The interpreter recalls whether the exception has to be re-raised,
    // or whether the function returns, and continues with the outer-next block.
    // As of now, we always assume that no exception needs to be re-raised.
    f.blockStack.pop();
}


optable[opcodes.POP_BLOCK] = function(f: Py_FrameObject) {
    // removes a block from the block stack
    f.blockStack.pop();
}

optable[opcodes.GET_ITER] = function(f: Py_FrameObject) {
    // replace TOS with iter(TOS)
    var tos = f.pop();
    f.push(builtins.iter([tos],{}));
}

optable[opcodes.FOR_ITER] = function(f: Py_FrameObject) {
    // calls next() on the iter object at TOS
    var delta = f.readArg();
    var iter = <Iterator> f.peek();
    var res = iter.next();
    if (res != null) {
        f.push(res);
    } else {
        f.pop();
        f.lastInst += delta;
    }
}

optable[opcodes.IMPORT_NAME] = function(f: Py_FrameObject) {
    var name_idx = f.readArg();
    // see https://docs.python.org/2/library/functions.html#__import__
    var fromlist = f.pop();
    var level = (<Py_Int> f.pop()).toNumber();
    var name = f.codeObj.names[name_idx];
    var mod;
    // TODO: implement this. For now, we no-op.
    // mod = builtins.__import__(name, f.globals, f.locals, fromlist, level)
    f.push(mod);
}

optable[opcodes.IMPORT_FROM] = function(f: Py_FrameObject) {
    var name_idx = f.readArg();
    var mod = f.pop();
    var attr;
    // TODO: implement this. For now, we no-op.
    // attr = mod.codeObj.names[name_idx]
    f.push(attr);
}

// Replaces TOS with getattr(TOS, co_names[namei]).
optable[opcodes.LOAD_ATTR] = function(f: Py_FrameObject) {
  var name = f.codeObj.names[f.readArg()].toString(), obj = <Py_List> f.pop(), val = obj[name];
  // XXX: We need a better way to handle functions!
  if (typeof(val) === 'function') {
    // Create an anonymous function binding `obj` to this particular property.
    f.push(<any> ((args: IPy_Object[], kwargs: { [name: string]: IPy_Object }) => obj[name](args, kwargs)));
  } else if (val === undefined) {
    throw new Error(`Invalid attribute: ${name}`);
  } else {
    f.push(val);
  }
}

optable[opcodes.BUILD_SLICE] = function(f: Py_FrameObject) {
  var argv = f.readArg(), step: IPy_Object, start: IPy_Object, stop: IPy_Object;
  if (argv === 3) {
    step = f.pop();
  } else {
    step = None;
  }
  stop = f.pop();
  start = f.pop();
  f.push(new Py_Slice(start, stop, step));
}

export = optable;
