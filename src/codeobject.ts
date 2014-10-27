// Py_CodeObject models the Python Code Object, which is used to represent
// functions, blocks, modules, etc. -- anything that can be executed.
// The various fields are derived from inspecting code objects (see the Inspect
// module in the std lib).
class Py_CodeObject {
    // Args are ordered by appearance in marshal format
    constructor(public argcount: number,
                public nlocals: number,
                public stacksize: number,
                public flags: number,
                public code: Buffer,
                public consts: any[],
                public names: string[],
                public varnames: string[],
                public freevars: string[],
                public cellvars: string[],
                public filename: string,
                public name: string,
                public firstlineno: number,
                public lnotab: string) {}
}
export = Py_CodeObject;
