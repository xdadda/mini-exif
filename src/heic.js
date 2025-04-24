import {readEXIFData, editExifData} from './exif.js'
import {readICCData} from './icc.js'
import {getStringFromDB, concatArrayBuffers, downloadFile} from './tools.js'
const debug=false
// https://trepo.tuni.fi/bitstream/handle/123456789/24147/heikkila.pdf?sequence=3
// https://aomediacodec.github.io/av1-avif/
// https://github.com/wangf1978/DumpTS/blob/master/doc/ISOBMFF_README.md#show-isobmff-file-layout
// https://github.com/lclevy/canon_cr3/blob/master/heif.md

      //https://github.com/mattiasw/ExifReader/blob/main/src/image-header-iso-bmff.js
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

  // @data: is file's ArrayBuffer
  // return {icc:{data:,offset:},exif:{data:,offset:}}
  function heic_parseBoxes(data) {
    if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer')
    const datalength = data.byteLength
    const dataView = new DataView(data);

    if( (dataView.getUint32(4)!==0x66747970&&dataView.getUint32(8)!==0x68656963)
        || (dataView.getUint32(4)!==0x66747970&&dataView.getUint32(8)!==0x61766966)
      ) return console.error('[MiNi exif]: data is not HEIC/AVIF')

    let tags={}

    if(dataView.getUint32(8)===0x68656963)
      tags = {_format:'HEIC'}
    else
      tags = {_format:'AVIF'}
  

    let offset=0, exif_id, xml_id, iccraw={}, iloc_table={}
    while (offset + 4 + 4 <= dataView.byteLength) {
        const box = parseBox(dataView, offset);
        if (box === undefined) break;
        debug&&console.log('>',box)
        if (box.str === 'meta') {
          offset += 12 //let's open it
          continue
        }
        if (box.str === 'iinf') {
            //EXIF: iinf > iloc > exif
            //iinf: it's a sequence of 'infe' made of around 21bytes: infe(4)+xxx(4)+infid(4)+infstr(4)+xxx(5)
            let infe_num = dataView.getUint32(box.contentOffset+2)
            let infe_off = box.contentOffset+8+2
            for (let ii=0; ii<infe_num; ii++) {
              debug&&console.log('infe',infe_off,ii+1+'/'+infe_num,getStringFromDB(dataView,infe_off+12,4), 'str: 0x'+dataView.getUint32(infe_off+12).toString(16), 'id: 0x'+dataView.getUint32(infe_off+8).toString(16) )
              //save Exif (0x45786966) identifier used in the iloc table
              if(dataView.getUint32(infe_off+12)===0x45786966){
                exif_id=dataView.getUint32(infe_off+8)
              }
              // save mime (0x6d696d65) = XML
              else if(dataView.getUint32(infe_off+12)===0x6d696d65){
                xml_id=dataView.getUint32(infe_off+8)
              }

              if(ii+1<infe_num){
                infe_off+=16
                //find next 'infe' (0x696E6665), as size seems to vary between blocks
                while(dataView.getUint32(infe_off)!==0x696E6665 && infe_off<20000) {
                  infe_off++
                }              
              }
            }
        }
        else if (box.str === 'iloc') {
          //Build iloc table

          //https://github.com/Exiv2/exiv2/issues/2162

          //iloc: sequence of 16 bytes _id(4)+00000001(4)+infoffset(4)+size(4) [18 bytes in AVIF]
          const iloc_unknown = dataView.getUint32(box.contentOffset+2)
          const iloc_num = dataView.getUint16(box.contentOffset+6)
          const iloc_len=(box.length-16)/iloc_num
          //console.log('iloc num',iloc_num, iloc_len)
          const iloc_off = box.contentOffset+8
          //for (let ii=0; ii<infe_num; ii++) {
          for (let ii=0; ii<iloc_num; ii++) {
            if(iloc_len===16){ //HEIC
              const iloc_id = dataView.getUint32(iloc_off+ii*iloc_len)
              const iloc_contentoff = dataView.getUint32(iloc_off+ii*iloc_len+8)
              const iloc_size = dataView.getUint32(iloc_off+ii*iloc_len+12)
              debug&&console.log('iloc',ii+1,'id:'+iloc_id.toString(16),'offset:'+iloc_contentoff.toString(16),'size:'+iloc_size.toString(16))
              iloc_table[iloc_id]={id:iloc_id,off:iloc_contentoff,size:iloc_size,type:'heic'}
            }
            else if(iloc_len===18){ //AVIF
              const iloc_id = dataView.getUint32(iloc_off+ii*iloc_len)
              let iloc_contentoff = dataView.getUint32(iloc_off+ii*iloc_len+4)
              if(!iloc_contentoff) iloc_contentoff = dataView.getUint32(iloc_off+ii*iloc_len+10)
              const iloc_size = dataView.getUint32(iloc_off+ii*iloc_len+14)
              debug&&console.log('iloc',ii+1,'id:'+iloc_id.toString(16),'offset:'+iloc_contentoff.toString(16),'size:'+iloc_size.toString(16))
              iloc_table[iloc_id]={id:iloc_id,off:iloc_contentoff,size:iloc_size,type:'avif'}
            }
            else console.error('[MiNi exif]: unknown iloc block length',iloc_len)
          } 
        }
        else if (box.str === 'iprp') {
          // ICC: iprp > ipco > colr, and then the whole profile is stored there

          // --HEIC specific-- -ICC PROFILE starts here-----------------
          // --- 'colrprof' -- -size------   --CMMtype--  --version-- profileclass  ....
          // 636F6C72 70726F66 00 00 02 18   61 70 70 6C  04 00 00 00  6D 6E 74 72 ....
          //   starts here -->  0  1  2  3
          const sub = parseSubbox(dataView,box)
          debug&&console.log('iprp',sub)
          if(sub.ipco) {
            const ssub = parseSubbox(dataView,sub.ipco)
            debug&&console.log('iprp > ipco',ssub)
            if(ssub.colr) {
              const profile = getStringFromDB(dataView,ssub.colr.contentOffset,4)
              debug&&console.log('iprp > ipco > colr',profile,'offset:'+(ssub.colr.contentOffset+4))
              if(profile==='prof' || profile==='rICC'){
                const iccoff=ssub.colr.contentOffset+4
                iccraw={offset:iccoff, data:data.slice(iccoff, iccoff+ssub.colr.length-8)}                
              }
            }
          }
        }
        offset += box.length;
    }
  
    //use exifId in iloc table to locate EXIF metadata
    if(exif_id && iloc_table[exif_id]){
      const {off, size, type} = iloc_table[exif_id]
      if(type==='heic'){
        const skip = dataView.getUint32(off)
        const raw = data.slice(off+4+skip, off+4+skip+size-4-skip) //skip 'Exif  ' header
        tags.exif = {data: raw, offset:off+4+skip}
      }
      else if(type==='avif'){
        const skip = dataView.getUint32(off)
        const raw = data.slice(off+4+skip, off+4+skip +size-4-skip )
        tags.exif = {data: raw, offset:off+4+skip}
      }
    }
    if(xml_id && iloc_table[xml_id]){
      const {off, size, type} = iloc_table[xml_id]
      if(type==='heic'){
        const raw = data.slice(off, off+size ) //skip 'Exif  ' header
        tags.xml = {data: raw, offset:off}
      }
      else if(type==='avif'){
        const raw = data.slice(off, off+size )
        tags.xml = {data: raw, offset:off}
      }
    }
    tags.icc = iccraw
    return tags
  }

  // NOTE: we can't unpack & repack a HEIC file, but we can overwrite it's EXIF if the new one has the same length
  // @data: is file's ArrayBuffer
  // @exif: is ArrayBuffer  (clean of format specific headers)
  // @currentExif: {data: ArrayBuffer, offset:Number}
  // return new file's ArrayBuffer
  function heic_replaceEXIF(data, exifraw, currentExif) {
    if(!data) return console.error('[MiNi exif]: please load file first')
    if(!exifraw) return console.error('[MiNi exif]: exif data missing')

    const offset=currentExif.offset
    const len=currentExif.data.byteLength
    const newfiledata = concatArrayBuffers(data.slice(0,offset),exifraw,data.slice(offset+len))
    return newfiledata
  }


export function exifHEIC(arrayBuffer) {
  let filedata=arrayBuffer;
  let format;
  let exifdata, iccdata, xmldata, exiftags;

  function updateExif(){
    if(filedata) {
      const {exif, icc, xml, _format} = heic_parseBoxes(filedata)
      exifdata=exif
      iccdata=icc
      xmldata=xml
      format=_format
    }
    updateTags()
  }
  function updateTags(){
    if(exifdata?.data) {
      exiftags= readEXIFData(exifdata.data, 0)
      exiftags={...exiftags,format}
    }
    else {exiftags=null}

    if(iccdata?.data) {
      exiftags = {...exiftags, icc:readICCData(iccdata.data,0)}
    }

    if(xmldata) {
      const decoder = new TextDecoder();
      const str = decoder.decode(xmldata.data);
      exiftags={...exiftags, xml:str};
    }

  }
  updateExif()

  return {
    load:(arrayBuffer)=>{filedata=arrayBuffer;updateExif();}, //input file's arrayBuffer
    read:()=>exiftags, //returns EXIF tags
    extract:()=>exifdata.data,
    image:()=>filedata,
    download:(name)=>downloadFile(filedata,name),
    replace:(newexifraw)=>{
      if(newexifraw.byteLength!==exifdata.data.byteLength) return console.error('[MiNi exif]: new exif length must be '+exifdata.data.byteLength+' bytes')
      filedata=heic_replaceEXIF(filedata, newexifraw, exifdata);
      updateExif();
      return filedata;
    },
    patch:(input)=>{  

      function patchOne(info){
        if(info instanceof Object) {
          const {area, field, value, value2} = info
          if(!area || !field || value===undefined) return console.error('[MiNi exif]: patch missing input',area,field,value)
          exifdata.data=editExifData(exiftags, exifdata.data, area, field, value, value2)
        }
        else return console.error('[MiNi exif]: patch wrong input',info)
      }

      if(!exiftags) return console.error('[MiNi exif]: no exif data')
      if (input instanceof Array) {
        input.forEach(i=>patchOne(i))
      }
      else if(input instanceof Object) {
        patchOne(input)
      }
      filedata=heic_replaceEXIF(filedata, exifdata.data, exifdata);
      updateExif();
    }

  }
}


