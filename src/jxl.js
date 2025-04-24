import {readEXIFData} from './exif.js'

import {getStringFromDB} from './tools.js'
import brotliPromise from 'brotli-wasm';

const debug=false

// https://github.com/ImageMagick/jpeg-xl/blob/main/doc/format_overview.md

      function getBoxLength(dataView, offset) {
          const boxLength = dataView.getUint32(offset);
          if (boxLength === 0) {
              return {
                  length: dataView.byteLength - offset,
                  contentOffset: offset + 4 + 4,
              };
          }
          if (boxLength === 1) {
              if (dataView.getUint32(offset + 8) === 0) {
                  return {
                      length: dataView.getUint32(offset + 12),
                      contentOffset: offset + 4 + 4 + 8,
                  };
              }
          }
          return {
              length: boxLength,
              contentOffset: offset + 4 + 4,
          };
      }
      function parseBox(dataView, offset){
        const {length, contentOffset} = getBoxLength(dataView, offset)
        if(length < 8) return undefined
        const type = dataView.getUint32(offset + 4)
        return {type,length, str:getStringFromDB(dataView,offset+4,4), contentOffset}
      }
      function parseSubbox(dataView, box) {
        let sub = {}
        let len = box.length-8, poffset=box.contentOffset
        while (len>0) {
          //check properties: size(4)+tag(4)
          const pstr = getStringFromDB(dataView,poffset+4,4), psize = dataView.getUint32(poffset)
          sub[pstr]={length:psize, str:pstr, contentOffset:poffset+8}
          poffset+=psize
          len -= psize
        }
        return sub
      }

      async function decompressBrob(data){
        const brotli = await brotliPromise;
        return brotli.decompress(data);
      }

  // @data: is file's ArrayBuffer
  // return {icc:{data:,offset},exif:{data:,offset:}}
  async function jxl_parseBoxes(data) {
    if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer')
    const datalength = data.byteLength
    const dataView = new DataView(data);

    if(!(dataView.getUint32(4)===0x4A584C20 && dataView.getUint32(8)===0x0D0A870A))
      return console.error('[MiNi exif]: data is not JPEG-XL')


    let offset=0
    let exifdata,xmldata
    while (offset + 4 + 4 <= dataView.byteLength) {
        const box = parseBox(dataView, offset);
        if (box === undefined) break;
        debug&&console.log('>',box)
        if (box.str === 'meta') {
          offset += 12 //let's open it
          continue
        }
        if(box.str === 'brob') {
          const key = getStringFromDB(dataView,box.contentOffset,4)
          debug&&console.log('brob>',key,box.length-12)
          if(key==='Exif'){
            const load = data.slice(box.contentOffset+4,box.contentOffset+4+box.length-12)
            exifdata = await decompressBrob(new Uint8Array(load))
            exifdata = exifdata?.buffer
          }
          else if(key==='xml '){
            const load = data.slice(box.contentOffset+4,box.contentOffset+4+box.length-12)
            xmldata = await decompressBrob(new Uint8Array(load))
            xmldata = xmldata?.buffer
          }
        }
        if(box.str === 'Exif'){
          exifdata=data.slice(box.contentOffset,box.contentOffset+box.length-8)
        }
        if(box.str === 'xml '){
          xmldata=data.slice(box.contentOffset,box.contentOffset+box.length-8)
        }
        offset += box.length;
    }
    let tags={}
    return {exif:exifdata, xml:xmldata}
  }



  export async function exifJXL(arrayBuffer){
    let filedata=arrayBuffer;
    let exifdata, xmldata, exiftags;

    async function updateJXL(){
      if(filedata) {
        const {exif, xml} = await jxl_parseBoxes(filedata)
        exifdata=exif
        xmldata=xml
      }
      updateTags()
    }

    function updateTags(){
      if(exifdata) {
        exiftags= readEXIFData(exifdata, 4)
        exiftags={...exiftags,format:'JXL'}
      }
      else {exiftags=null}

      if(xmldata) {
        const decoder = new TextDecoder();
        const str = decoder.decode(xmldata);
        exiftags={...exiftags, xml:str};
      }
    }
    await updateJXL()
    
    return {
      load:(arrayBuffer)=>{filedata=arrayBuffer;updateExif();}, //input file's arrayBuffer
      read:()=>exiftags, //returns EXIF tags
    }

  }


