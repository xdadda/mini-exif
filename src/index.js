import {exifJPG} from './jpg.js'
import {exifPNG} from './png.js'
import {exifHEIC} from './heic.js'
//import {exifJXL} from './jxl.js'
import {qt_parseBoxes} from './qt.js'

// TODO:
// - HEIC: allow for smaller exifdata to replace existing one (with resize)
// - Add XML support across formats
// - Add JUMBF support across formats


// support for JPEG, PNG, HEIC/AVIF, JPEG-XL, Apple Quicktime videos
// @data: is ArrayBuffer
// @quicktime: not strictly needed, but if set will avoid reading the whole video in memory and will just check the tail chunk/data (if provided by caller) for relevant pointer!
export default function miniExif(data,quicktime=false) {

    if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer')
    const dataView = new DataView(data);

    ///// JPEG ////////////////////////////////
    if(dataView.getUint16(0)===0xFFD8 /*&& dataView.getUint16(datalength-2)===0xFFD9*/ ){ //Start of Image
      return exifJPG(data)
    }
    ///// PNG ////////////////////////////////
    else if (dataView.getUint32(0)===0x89504E47 && dataView.getUint32(4)===0x0D0A1A0A) {
      return exifPNG(data)
    }
    ///// HEIC-AVIF ////////////////////////////////
    else if (dataView.getUint32(4)===0x66747970 && (dataView.getUint32(8)===0x68656963 || dataView.getUint32(8)===0x61766966)) {
      return exifHEIC(data)
    }
    ///// JPEG-XL ////////////////////////////////
    /*
    else if (dataView.getUint32(4)===0x4A584C20 && dataView.getUint32(8)===0x0D0A870A) {
      return exifJXL(data)
    }
    */
    ///// APPLE QuickTime-MOV ///////////////////////
    else if(quicktime || (dataView.getUint32(4)===0x66747970 && dataView.getUint32(8)===0x71742020) ){ //checking that file starts with magicstring 'ftypqt  ' at offset 0x4 
      return qt_parseBoxes(data)
    }
    else console.error('[MiNi exif]: unknown format')

  }
//////////////////////////
