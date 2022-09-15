//const fs = require("fs");
//const { createCanvas, loadImage } = require('canvas');
//const {run_color_reduction} = require("../lib/image_parse.js");
import fs from 'fs'
import { createCanvas, loadImage } from 'canvas'
import {run_color_reduction, resize_image} from "../lib/image_parse.js"

async function li(src){
    let img = await loadImage(src);
    return img;
}

async function body(src){
    let img = await li("./sample.jpg");    
    const canvas = createCanvas(img.width, img.height);
    const context = canvas.getContext('2d');

    context.drawImage(img, 0, 0, img.width, img.height);
    let imagedata = context.getImageData(0, 0, img.width, img.height);
    // console.log(run_color_reduction);
    const out = run_color_reduction(imagedata.data, imagedata.width, imagedata.height, 16, [6, 6, 6]);
    let dst = context.createImageData(canvas.width, canvas.height);
    //console.log(dst.data);
    //dst.data = out.image_parsed;
    //console.log(dst.data);
    const resize_out = resize_image(out.image_dot_list, imagedata.width, imagedata.height, out.color_list, 1, true, 0.0);
    for(let i=0;i<imagedata.width * imagedata.height * 4;++i){
        dst.data[i] = resize_out[i];
    }
    
    context.putImageData(dst, 0, 0);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./test4.png', buffer);
}

body();
