const map = (fn, x) =>
    Object.keys(x).reduce((mem, k) => {
        mem[k] = fn(k, x[k]);
        return mem;
    }, {});

export default map;
