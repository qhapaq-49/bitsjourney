
var defaultcomparator = function (a, b) {
    return   a < b ? -1 : (a > b ? 1 : 0) ;
};

// the provided comparator function should take a, b and return a negative number when a < b and equality when a == b
function StablePriorityQueue(comparator) {
    this.array = [];
    this.size = 0;
    this.runningcounter = 0;
    this.compare = comparator || defaultcomparator;
    this.stable_compare = function(a, b) {
      var cmp = this.compare(a.value,b.value);
      return (cmp < 0) || ( (cmp == 0) && (a.counter < b.counter) );
    }
}

// The stable queue uses internal counters, this repacks them
// runs in O(n) time, called automatically as needed
StablePriorityQueue.prototype.renumber = function (myval) {
      // the counter is exhausted, let us repack the numbers
      // implementation here is probably not optimal performance-wise
      // we first empty the content
      var buffer = [];
      var j, size;
      while(! this.isEmpty() ) {
        buffer.push(this.poll());
      }
      size = buffer.length;
      this.runningcounter = 0; // because the buffer is safe, this is now safe
      // and we reinsert it
      for (j = 0; j < size ; j++) {
        this.add(buffer[j]);
      }
}

// Add an element the the queue
// runs in O(log n) time
StablePriorityQueue.prototype.add = function (myval) {
    var i = this.size;
    if ( this.runningcounter + 1 == 0) {
      this.renumber();
    }
    var extendedmyval = {value: myval, counter: this.runningcounter};
    this.array[this.size] = extendedmyval;
    this.runningcounter += 1;
    this.size += 1;
    var p;
    var ap;
    var cmp;
    while (i > 0) {
        p = (i - 1) >> 1;
        ap = this.array[p];
        if (!this.stable_compare(extendedmyval, ap)) {
             break;
        }
        this.array[i] = ap;
        i = p;
    }
    this.array[i] = extendedmyval;
};

// for internal use
StablePriorityQueue.prototype._percolateUp = function (i) {
    var myval = this.array[i];
    var p;
    var ap;
    while (i > 0) {
        p = (i - 1) >> 1;
        ap = this.array[p];
        if (!this.stable_compare(myval, ap)) {
            break;
        }
        this.array[i] = ap;
        i = p;
    }
    this.array[i] = myval;
};


// for internal use
StablePriorityQueue.prototype._percolateDown = function (i) {
    var size = this.size;
    var hsize = this.size >>> 1;
    var ai = this.array[i];
    var l;
    var r;
    var bestc;
    while (i < hsize) {
        l = (i << 1) + 1;
        r = l + 1;
        bestc = this.array[l];
        if (r < size) {
            if (this.stable_compare(this.array[r], bestc)) {
                l = r;
                bestc = this.array[r];
            }
        }
        if (!this.stable_compare(bestc,ai))  {
            break;
        }
        this.array[i] = bestc;
        i = l;
    }
    this.array[i] = ai;
};

// Look at the top of the queue (a smallest element)
// executes in constant time
//
// Calling peek on an empty priority queue returns
// the "undefined" value.
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined
//
StablePriorityQueue.prototype.peek = function () {
    if(this.size == 0) return undefined;
    return this.array[0].value;
};

// remove the element on top of the heap (a smallest element)
// runs in logarithmic time
//
// If the priority queue is empty, the function returns the
// "undefined" value.
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined
//
// For long-running and large priority queues, or priority queues
// storing large objects, you may  want to call the trim function
// at strategic times to recover allocated memory.
StablePriorityQueue.prototype.poll = function () {
    if (this.size == 0)
        return undefined;
    var ans = this.array[0];
    if (this.size > 1) {
        this.array[0] = this.array[--this.size];
        this._percolateDown(0 | 0);
    } else {
        this.size -= 1;
    }
    return ans.value;
};


// recover unused memory (for long-running priority queues)
StablePriorityQueue.prototype.trim = function () {
    this.array = this.array.slice(0, this.size);
};

// Check whether the heap is empty
StablePriorityQueue.prototype.isEmpty = function () {
    return this.size === 0;
};

class ImageBlock{
    constructor(){
        this.indice = new Set();
        this.neighbor = new Set();
        this.generation = 0;
    }

    calc_moment(img_array){
        this.moment = [0.0, 0.0, 0.0];
        if (this.indice.size == 0){
            return;
        }
        for(let i=0; i<3; ++i){
            for(let idx of this.indice){
                this.moment[i] += img_array[idx*4+i];
            }
            this.moment[i] = this.moment[i] / this.indice.size;
        }
    }
}

class BlockUnionFind{
    constructor(blocks){
        let n = blocks.length;
        this.parent = [];
        this.rank = [];
        this.size = [];
        this.blocks = blocks;
        for (let i=0; i<n; ++i){
            this.parent.push(i);
            this.rank.push(0);
            this.size.push(1);
        }
    }

    get_root(x){
        if(this.parent[x] == x){
            return x;
        }
        this.parent[x] = this.get_root(this.parent[x])
        return this.parent[x];
    }

    union(x_in, y_in){
        let x = this.get_root(x_in);
        let y = this.get_root(y_in);
        if (x!=y){
            if(this.rank[x] < this.rank[y]){
                const tmp = x;
                x = y;
                y = tmp;
            }
            if (this.rank[x] == this.rank[y]){
                this.rank[x] += 1;
            }
            this.parent[y] = x;
            this.size[x] += this.size[y];
            this.merge_block(x, y);
            return x;
        }
        return -1;
    }

    merge_block(x, y){
        if (this.blocks[x].indice.size != 0 || this.blocks[y].indice.size != 0){
            for (let i=0; i<3; ++i){
                this.blocks[x].moment[i] = (this.blocks[x].moment[i] * this.blocks[x].indice.size + this.blocks[y].moment[i] * this.blocks[y].indice.size ) / (this.blocks[x].indice.size + this.blocks[y].indice.size);
            }
        }
        for(let idx of this.blocks[y].indice){
            this.blocks[x].indice.add(idx);
        }
        for(let nei of this.blocks[y].neighbor){
            if(nei != x){
                this.blocks[x].neighbor.add(nei);
            }
        }
        this.blocks[x].generation += 1;
        this.blocks[y].generation = -1;
    }
}

function calc_weight_dissimilarity(block1, block2){
    //console.log(block1.indice);
    //console.log(block1.moment);
    let num = block1.indice.size * block2.indice.size;
    let dist = 0.0;
    for (let i=0; i<3; ++i){
        dist += (block1.moment[i] - block2.moment[i]) * (block1.moment[i] - block2.moment[i]);
    }
    dist = Math.sqrt(dist);
    return dist * num;
}


function set_zero_group(blocks, idx, checked, zero_cluster, neighbors){
    let check_list = new Set();
    check_list.add(idx);
    while(1){
        if (check_list.size == 0){
            return;
        }
        root = check_list.shift();
        for (let nei of blocks[root].neighbor){
            if (zero_cluster.has(nei) || neighbors.has(nei)){
                continue;
            }
            if (blocks[nei].indice.size != 0){
                neighbors.add(nei);
            }else{
                checked.add(nei);
                zero_cluster.add(nei);
                check_list.add(nei);
            }
        }
    }
}

function purge_zero_groups(blocks, zero_set, neighbors_list){
    let checked = new Set();
    for(let i=0;i<blocks.length;++i){
        if(checked.has(i)){
            continue;
        }
        if(blocks[i].size == 0){
            let zero_cluster = new Set();
            let neighbor = new Set();
            set_zero_group(blocks, i, zero_cluster, neighbor);
            zero_set = union(zero_set, zero_cluster);
            neighbors_list.push(neighbors);
        }
    }
}

function resize_image(image_idx, width, height, color_list, pixel_size, use_line_filter, cnt_ratio){
    const h_itr = parseInt(height / pixel_size) + 1;
    const w_itr = parseInt(width / pixel_size) + 1;
    
    let output = new Uint8ClampedArray(width * height * 4);
    let block_dict = new Array(h_itr); 
    for(let y=0;y<h_itr;++y){
        block_dict[y] = new Array(w_itr);
        for(let x=0;x<w_itr;++x){
            block_dict[y][x] = {};
        }
    }
    let pixel_idx = 0;
    for(let y = 0; y < height; ++y) {
        for (let x=0; x<width; ++x){
            const y_idx = parseInt(y / pixel_size);
            const x_idx = parseInt(x / pixel_size);
            if(image_idx[pixel_idx] in block_dict[y_idx][x_idx]){
                block_dict[y_idx][x_idx][image_idx[pixel_idx]] += 1.0;
            }else{
                block_dict[y_idx][x_idx][image_idx[pixel_idx]] = 1.0;
            }
            pixel_idx += 1;
        }
    }

    for(let y=0;y<h_itr;++y){
        for(let x=0;x<w_itr;++x){

            // 輪郭線補正
            if(use_line_filter && y != 0 && x != 0 && y!=h_itr-1 && x!=w_itr-1){
                for (let x_diff=-1;x_diff<2;++x_diff){
                    for (let y_diff=-1;y_diff<2;++y_diff){
                        for (let key in block_dict[y+y_diff][x+x_diff]){
                            if(block_dict[y][x][key]){
                                block_dict[y][x][key] -= cnt_ratio * block_dict[y+y_diff][x+x_diff][key]
                            }
                        }
                    }
                }
            }
            
            // 補正後の最多数をそのblockの色とする
            let max_value = -999999;
            let max_idx = 0;
            for (let key in block_dict[y][x]){
                if (block_dict[y][x][key] > max_value){
                    max_idx = key;
                    max_value = block_dict[y][x][key];
                }
            }
            // blockに所属する全てのピクセルの色を書き換える
            for (let py=0;py<pixel_size;++py){
                const y_idx = y * pixel_size + py;
                if(y_idx >= height){
                    continue;
                }
                for (let px=0;px<pixel_size;++px){
                    const x_idx = x * pixel_size + px;
                    if(x_idx >= width){
                        continue;
                    }
                    const pixel_idx_to_use = y_idx * width + x_idx;
                    for (let i=0;i<3;++i){
                        output[pixel_idx_to_use*4+i] = color_list[max_idx][i];
                    }
                    output[pixel_idx_to_use*4+3] = 255;
                }
            }
        }
    }
    return output;

}

function run_color_reduction(image_raw, image_width, image_height, color_target, rgb_mesh){
    blocks = new Array(rgb_mesh[0] * rgb_mesh[1] * rgb_mesh[2]);
    for(let i=0;i<blocks.length;++i){
        blocks[i] = new ImageBlock();
        if(i % rgb_mesh[2] != 0){
            blocks[i].neighbor.add(i-1);
        }
        if(i % rgb_mesh[2] != rgb_mesh[2] - 1){
            blocks[i].neighbor.add(i+1);
        }
        if(parseInt(i/rgb_mesh[2])%rgb_mesh[1] != 0){
            blocks[i].neighbor.add(i-rgb_mesh[2]);
        }
        if(parseInt(i/rgb_mesh[2])%rgb_mesh[1] != rgb_mesh[1]-1){
            blocks[i].neighbor.add(i+rgb_mesh[2]);
        }
        if(parseInt(i/(rgb_mesh[2]*rgb_mesh[1]))%rgb_mesh[0] != 0){
            blocks[i].neighbor.add(i-rgb_mesh[2] * rgb_mesh[1]);
        }
        if(parseInt(i/(rgb_mesh[2]*rgb_mesh[1]))%rgb_mesh[0] != rgb_mesh[0]-1){
            blocks[i].neighbor.add(i+rgb_mesh[2] * rgb_mesh[1]);
        }
    }
    
    let img_idx = 0;
    for(let y=0;y<image_height;++y){
        for (let x=0;x<image_width;++x){
            const id_x = parseInt(rgb_mesh[0] * image_raw[img_idx*4] / 256);
            const id_y = parseInt(rgb_mesh[1] * image_raw[img_idx*4+1] / 256);
            const id_z = parseInt(rgb_mesh[2] * image_raw[img_idx*4+2] / 256);
            const idx = id_x * rgb_mesh[1] * rgb_mesh[2] + id_y * rgb_mesh[2] + id_z;
            blocks[idx].indice.add(img_idx);
            img_idx += 1;
        }
    }

    let nonzero = 0;
    for(let block of blocks){
        block.calc_moment(image_raw);
        if(block.indice.length != 0){
            nonzero += 1;
        }
    }
    let block_to_merge = nonzero - color_target;
    if(block_to_merge < 0){
        console.log("warning too small mesh. decrease color");
        block_to_merge = 1;
    }
    let zero_set = new Set();
    let zero_neighbors = new Array();
    purge_zero_groups(blocks, zero_set, zero_neighbors);
    let block_union = new BlockUnionFind(blocks);
    
    for (let zero_neighbor of zero_neighbors){
        for(let idx of zero_neighbor){
            for (let idx2 of zero_neighbor){
                if (idx != idx2){
                    blocks[idx].neighbor.add(idx2);
                }
            }
        }
    }
    
    for(let i=0;i<blocks.length;++i){
        if(zero_set.has(i)){
            blocks[i].generation = -1;
            continue;
        }
    }

    let pq = new StablePriorityQueue(function(a, b) {return a.priority - b.priority;})
    for(let i=0;i<blocks.length;++i){
        if(zero_set.has(i)){
            blocks[i].generation = -1;
            continue;
        }
        for(let nei of blocks[i].neighbor){
            if(zero_set.has(nei)){
                continue;
            }
            imp = calc_weight_dissimilarity(blocks[i], blocks[nei]);
            pq.add(
                {
                    "priority" : imp,
                    "idx0" : i,
                    "gen0" : blocks[i].generation,
                    "idx1" : nei,
                    "gen1" : blocks[nei].generation
                }
            );
        }
    }
    let block_merged = 0
    let que_resolve = 0
    let que_gen = 0
    while(1){
        que_resolve += 1
        let merge_candidate = pq.poll();
        if (block_union.get_root(merge_candidate["idx0"]) != merge_candidate["idx0"]){
            continue;
        }
        if (block_union.get_root(merge_candidate["idx1"]) != merge_candidate["idx1"]){
            continue;
        }
        if (blocks[merge_candidate["idx0"]].generation != merge_candidate["gen0"]){
            continue;
        }
        if (blocks[merge_candidate["idx1"]].generation != merge_candidate["gen1"]){
            continue;
        }
        let root = block_union.union(merge_candidate["idx0"], merge_candidate["idx1"]);
        block_merged += 1
        if (block_merged == block_to_merge){
            break;
        }

        for (let new_nei of blocks[root].neighbor){
            nei_to_use = block_union.get_root(new_nei);
            if (nei_to_use == root){
                continue;
            }
            if (blocks[nei_to_use].generation == -1){
                continue;
            }
            imp = calc_weight_dissimilarity(blocks[root], blocks[nei_to_use])
            pq.add(
                {
                    "priority" : imp,
                    "idx0" : root,
                    "gen0" : blocks[root].generation,
                    "idx1" : nei_to_use,
                    "gen1" : blocks[nei_to_use].generation
                }
            );
            que_gen += 1
            
        }
    }
    console.log(que_gen);
    console.log(que_resolve);


    let img_dot_list = new Array(image_height * image_width);
    let img_output = new Uint8ClampedArray(image_height * image_width * 4);
    let color_list = new Array();
    for(let block of blocks){
        if(block.generation != -1){
            for (let idx of block.indice){
                img_dot_list[idx] = color_list.length;
                for(let i=0;i<3;++i){
                    img_output[idx*4 + i] = parseInt(block.moment[i]);
                }
                img_output[idx*4+3] = image_raw[idx*4+3];
            }
            console.log(block.moment);
            color_list.push(
                [
                    parseInt(block.moment[0]),
                    parseInt(block.moment[1]),
                    parseInt(block.moment[2]),
                ]
            );
        }
    }

    return {
        "image_parsed" : img_output, 
        "color_list" : color_list,
        "image_dot_list" : img_dot_list
    }
}

module.exports = { run_color_reduction, resize_image };
