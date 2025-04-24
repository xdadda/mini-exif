import {readEXIFData, editExifData} from './exif.js'
import {readICCData} from './icc.js'
import {getStringFromDB,int32ToBytes, strToBytes,concatArrayBuffers, downloadFile} from './tools.js'
import {decompressSync} from 'fflate'


//https://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_PNG_files
//http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html#C.iCCP


      let crc_table 
      //where ab=arraybuffer
      function crc32(ab){
        if(!crc_table) {
          crc_table = new Uint32Array(256);
          for (let n=0; n<256; n++){
            let c=n;
            for (let k = 0; k < 8; k++) {
              if (c & 1)
                c = 0xedb88320 ^ (c >>> 1);
              else
                c = c >>> 1;
            }
            crc_table[n] = c;         
          }
        }
        var crc =  0 ^ (-1);
        //var ds = new DataStream(ab);
        //var dsArr = ds.readUint8Array();
        var dsArr = new Uint8Array(ab);
        for(var i = 0; i < ab.byteLength; i++){
            crc = (crc >>> 8) ^ crc_table[(crc ^ dsArr[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
      }

      //PNG FORMAT
      //CHUNK: length of data (4bytes) - type (4bytes) - data (variable) - crc (4bytes)
      function readChunk(dataView, offset, data){
        const len= dataView.getUint32(offset)
        const type= getStringFromDB(dataView,offset+4,4) //dataView.getUint32(offset+4)
        const dataoffset=offset+8
        const crc =  dataView.getUint32(offset+8+len)
        const raw = data.slice(offset,offset+12+len)
        //console.log(crc,crc32(raw.slice(4,-4)))
        return {len,type,data:raw,dataoffset,crc}
      }

      function getDatafromChunk(chunk){
        return chunk.data.slice(8,-4)
      }
      function createChunkfromData(data,type){
        const len = data.byteLength
        const lenbuff= int32ToBytes(data.byteLength).buffer
        const typebuff=strToBytes(type).buffer
        let tmpbuff = concatArrayBuffers(lenbuff,typebuff,data)
        const crc = crc32(tmpbuff.slice(4)) //crc is calculated on type+data
        const crcbuff = int32ToBytes(crc).buffer
        tmpbuff = concatArrayBuffers(tmpbuff,crcbuff)
        return {len, type, data:tmpbuff, crc}
      }




  // @data: is file's ArrayBuffer
  // return [{len:Number, data:arraybuffer, dataoffset:Number, crc:Number]
  function png_splitChunks(data) {
    if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer')
    const datalength = data.byteLength
    const dataView = new DataView(data);
    if(dataView.getUint32(0)!==0x89504E47 || dataView.getUint32(4)!==0x0D0A1A0A) return console.error('[MiNi exif]: data is not PNG')

    let offset=8, chunks=[{len:8,type:'',data:data.slice(0,8),dataoffset:0,crc:0}]
    while(offset<datalength){
      const chunk = readChunk(dataView, offset, data)
      chunks.push(chunk)
      offset+=12+chunk.len
    }
    return chunks
  }

  // @data: is file's ArrayBuffer
  // return exif's & icc's ArrayBuffer //NOTE: exif starts with 0x4D4D... it's clean of format specific headers
  function png_extractEXIF(data) {
    const chunks = png_splitChunks(data)
    let exif = chunks.find(e=>e.type==='eXIf') //return first occurence of EXIF
    if(exif) exif=getDatafromChunk(exif)

    let icc = png_extractICC(data, chunks)
    if(icc) {
        let byte = true, rawoffset=0, array = new Uint8Array(icc)
        //skip Profile name
        while(byte!==0){
          byte=array[rawoffset++]
        }
        rawoffset++ //skip Compression method
        array=array.slice(rawoffset)
        const c = decompressSync(new Uint8Array(array))
        icc=c?.buffer
    }
    let xml = png_extractTXT(data,chunks)
    return {exif,icc,xml}
  }

  /*
      //FIND ITXT XMP
      offset=8, chunk
      while(chunk?.type!=='iTXt'&&offset<datalength){
        chunk = readChunk(dataView, offset)
        //console.log('>',chunk?.type)
        offset+=12+chunk.len
      }
      if(chunk?.type==='iTXt') {
        if(chunk?.raw){
          const xmp = Array.from(new Uint8Array(chunk?.raw)).map(e=>String.fromCodePoint(e)).join('')
          tags.xmp_raw = {value:xmp, offset:chunk.rawoffset}
          const entries = [...xmp.matchAll(/(?<=<(exif|tiff):)(.*?)>(.*?)</g)] //[...xxx] needed for Safari!
          tags.xmp = {}
          entries.forEach(e=>{
            if(!tags.xmp[e[1]]) tags.xmp[e[1]]={}
            tags.xmp[e[1]][e[2]]={value:e[3],offset:e.index}
          })
        }
      }

  */

  function png_extractTXT(data,chunks) {
    if(!chunks) chunks = png_splitChunks(data)
    let xml=null
    const itxt= chunks.filter(e=>e.type==='iTXt')
    if(itxt?.length){
      itxt.forEach(e=>{
        const data = getDatafromChunk(e)
        const str = String.fromCharCode(...new Uint8Array(data.slice(0,3)))
        if(str==='XML') xml=data
      })
    }
    return xml
    /*
    const itxt = chunks.find(e=>e.type==='ITXT') //return first occurence of TXT
    if(itxt) return getDatafromChunk(icc)
    return null
    */
  }


  function png_extractICC(data,chunks) {
    if(!chunks) chunks = png_splitChunks(data)
    const icc = chunks.find(e=>e.type==='iCCP') //return first occurence of ICC
    if(icc) return getDatafromChunk(icc)
    return null
  }




  // @data: is file's ArrayBuffer
  // return new file's ArrayBuffer
  // Note: will also remove iTXt metadata
  function png_removeEXIF(data) {
    if(!data) return console.error('[MiNi exif]: please load file first')
    const chunks = png_splitChunks(data)
    const newchunks= chunks.filter(e=>e.type!=='eXIf' && e.type!=='iTXt')
    const newfiledata = concatArrayBuffers(...newchunks.map(s=>s.data))
    return newfiledata
  }

  // @data: is file's ArrayBuffer
  // @exif: is ArrayBuffer
  // return new file's ArrayBuffer
  function png_replaceEXIF(data, exifraw) {
    if(!data) return console.error('[MiNi exif]: please load file first')
    if(!exifraw) return console.error('[MiNi exif]: exif data missing')
    const chunks = png_splitChunks(data)
    //clear eXIf and iTXt chunks
    const newchunks= chunks.filter(e=>e.type!=='eXIf'&&e.type!=='iTXt')
    const newexifchunk = createChunkfromData(exifraw,'eXIf')
    //NOTE: IHDR chunk must come first ... place eXIf after it
    const newfiledata = concatArrayBuffers(...newchunks.slice(0,2).map(s=>s.data), newexifchunk.data,...newchunks.slice(2).map(s=>s.data))  
    return newfiledata
  }

export function exifPNG(arrayBuffer) {
  let filedata=arrayBuffer;
  let exifdata, iccdata, xmldata, exiftags, exifraw;

  function updateExif(){
    if(filedata) {
      const {exif, icc, xml} = png_extractEXIF(filedata)
      exifdata=exif
      iccdata=icc
      xmldata=xml
    }
    if(exifdata) {
      exiftags= readEXIFData(exifdata, 0) //0 bytes to skip PNG specific header
      exifraw=exifdata.slice(0) //exif_raw starts with 0x4D4D or 0x4949
    }
    else {exiftags=null;exifraw=null}

    if(iccdata) {
      exiftags = {...exiftags, icc:readICCData(iccdata,0)}
    }

    if(xmldata) {
      const decoder = new TextDecoder();
      const str = decoder.decode(xmldata);
      exiftags={...exiftags, xml:str};
    }

  }
  updateExif()

  return {
    load:(arrayBuffer)=>{filedata=arrayBuffer;updateExif();}, //input file's arrayBuffer
    remove:()=>{filedata=png_removeEXIF(filedata);updateExif();return filedata}, //returns new file's arrayBuffer
    read:()=>{return {...exiftags,format:'PNG'}}, //returns EXIF tags
    extract:()=>exifraw,
    image:()=>filedata,
    replace:(newexifraw)=>{
      filedata=png_replaceEXIF(filedata,newexifraw);
      updateExif();
      return filedata;
    },
    download:(name)=>downloadFile(filedata,name),
    //NOTE: patch strings: will require for the new string to be <= current string length
    //input is {area: 'exif'|'tiff'|'gps', field: String, value:Number|Array, value2:Number|Array}, where value2 needed to rational numbers
    //or [{...},{...}]
    patch:(input)=>{

      function patchOne(info){
        if(info instanceof Object) {
          const {area, field, value, value2} = info
          if(!area || !field || value===undefined) return console.error('[MiNi exif]: patch input missing',area,field,value)
          exifraw=editExifData(exiftags, exifraw, area, field, value, value2)
        }
        else return console.error('[MiNi exif]: patch input wrong',info)
      }

      if(!exiftags) return console.error('[MiNi exif]: no exif data')
      if (input instanceof Array) {
        input.forEach(i=>patchOne(i))
      }
      else if(input instanceof Object) {
        patchOne(input)
      }
      filedata=png_replaceEXIF(filedata,exifraw);
      updateExif();
    }
  }
}




