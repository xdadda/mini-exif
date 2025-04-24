import {readEXIFData, editExifData} from './exif.js'
import {readICCData} from './icc.js'
import {int16ToBytes, strToBytes, concatArrayBuffers,downloadFile} from './tools.js'
  
  /*
  const markers = {
    0xFFC0:'Start Of Frame',
    0xFFC2:'Start Of Frame',
    0xFFC4:'Huffman Table',
    0xFFD0:'Restart0',
    0xFFD1:'Restart1',
    0xFFD2:'Restart2',
    0xFFD3:'Restart3',
    0xFFD4:'Restart4',
    0xFFD5:'Restart5',
    0xFFD6:'Restart6',
    0xFFD7:'Restart7',
    0xFFD8:'SOI - Start of Image',
    0xFFD9:'EOI - End of Image',
    0xFFDA:'SOS - Start of Scan',
    0xFFDB:'Quantization Table',
    0xFFDD:'Restart Interval',
    0xFFE0:'APP0 - JFIF',
    0xFFE1:'APP1 - EXIF',
    0xFFE2:'APP2 - ICC',
    0xFFE3:'APP3 - Meta',
    0xFFE4:'APP4 - Flashpix',
    0xFFE5:'APP5',
    0xFFE6:'APP6',
    0xFFE7:'APP7',
    0xFFE8:'APP8',
    0xFFE9:'APP9',
    0xFFEA:'APP10 - Comment',
    0xFFEB:'APP11 - JPEG-HDR',
    0xFFEC:'APP12',
    0xFFED:'APP13 - Photoshop',
    0xFFEE:'APP14 - Adobe',
    0xFFEF:'APP15',
  }
  */

  // @data: is file's ArrayBuffer
  // return [{marker:'0xNNNN', data: ArrayBuffer}, {...}]
  function jpg_splitSegments(data) {
    if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer')
    const datalength = data.byteLength
    const dataView = new DataView(data);
    if(dataView.getUint16(0)!==0xFFD8) return console.error('[MiNi exif]: data is not JPG')
    // SOI (0xFFD8 start of image) -> APPn markers(0xFFEn ... 0xFFE1 for EXIF, 0xFFE2 for ICC) -> SOS (0xFFDA start of scan) -> EOI (0xFFD9 end of image)
    const SOS=0xFFDA, EOI=0xFFD9

    let segments=[], marker=null, offset = 2 //skip SOI
    segments.push({marker: '0xFFD8',data: data.slice(0,2)}) //push SOI
    while(marker != SOS) {
        let moffset = offset
        marker = dataView.getUint16(moffset)
        const size = dataView.getUint16(moffset + 2)
        const markerstr= marker.toString(16).toUpperCase().padStart(6,'0x')
        //console.log('MARKER>',markerstr,markers[marker])
        if(marker != SOS) {
          segments.push({marker: markerstr, data:data.slice(offset,offset+2+size)})
        }
        else { //Image
          segments.push({marker: markerstr, data:data.slice(offset,datalength)})
        }
        offset += 2 + size
    }
    return segments
  }


  // EXIF
  // -- JPEG specific (10 bytes) ---  --EXIF METADATA (exif_raw)-------
  // -APP1  -size  ----Exif string--  Endian -chk  IFD0 offset*
  // FF E1  XX XX  45 78 69 66 00 00  4D 4D 00 2A  00 00 00 08 .....
  //                                  ^ this is start         * offset from start

  // ICC
  // -----JPEG specific marker------- -ICC PROFILE starts here-----------------
  // ---- 'ICC_PROFILE/0' ----------- -size------   --CMMtype--  --version-- profileclass  color space  connection   date-time (12bytes)       signature*
  // 4943435F 50524F46 494C4500 01 01 00 00 02 18   61 70 70 6C  04 00 00 00  6D 6E 74 72  52 47 42 20  58 59 5A 20  000000000000000000000000  61 63 73 70
  //  header position starts here -->  0  1  2  3   4 ... for 12 ... signature at offset 36

  // @data: is file's ArrayBuffer
  // return exif's & icc's ArrayBuffer (with AAP1-SIZE-EXIF STRING)
  function jpg_extractEXIF(data) {
    const segments = jpg_splitSegments(data)
    let exif, xml
    const app1 = segments.filter(e=>e.marker==='0xFFE1')
    if(app1?.length) {
      app1.forEach(e=>{
        const str = String.fromCharCode(...new Uint8Array(e.data.slice(4,8)))
        if(str==='Exif') exif=e
        else xml = e
      })
    }
    //const exif = segments.find(e=>e.marker==='0xFFE1') //return first occurence of EXIF
    const icc = jpg_extractICC(data,segments) //to avoid splitting twice!
    return {exif:exif?.data, icc:icc?.data, xml:xml?.data}
  }

  // @data: is file's ArrayBuffer
  // return ICC's ArrayBuffer (without AAP1-SIZE-ICC STRING)
  function jpg_extractICC(data, segments) {
    const ICCstr='ICC_PROFILE\0'
    if(!segments) segments = jpg_splitSegments(data)
    const icc = segments.find(e=>e.marker==='0xFFE2') //return ICC
    if(!icc) return null
    //convert from ArrayBuffer to binary string
    const header = String.fromCharCode(...new Uint8Array(icc.data.slice(4,16)));
    if(header!==ICCstr) {
      console.error('[MiNi exif]: ICC_PROFILE missing')
      return null
    }
    return icc
  }


  // @data: is file's ArrayBuffer
  // return new file's ArrayBuffer
  function jpg_removeEXIF(data) {
    if(!data) return console.error('[MiNi exif]: please load file first')
    const segments = jpg_splitSegments(data)
    const newsegments= segments.filter(e=>e.marker!=='0xFFE1')
    const newfiledata = concatArrayBuffers(...newsegments.map(s=>s.data))
    return newfiledata      
  }



      function createDatafromEXIF(exifraw){
        const markerbuff=int16ToBytes(0xFFE1).buffer
        const lenbuff= int16ToBytes(exifraw.byteLength+8).buffer //+8 bytes (size + exif string)
        const signaturebuff=strToBytes('Exif\0\0').buffer
        return concatArrayBuffers(markerbuff,lenbuff,signaturebuff,exifraw)
      }


  // @data: is file's ArrayBuffer
  // @exif: is ArrayBuffer  (clean of format specific headers)
  // return new file's ArrayBuffer
  function jpg_replaceEXIF(data, exifraw) {
    if(!data) return console.error('[MiNi exif]: please load file first')
    if(!exifraw) return console.error('[MiNi exif]: exif data missing')
    const segments = jpg_splitSegments(data)
    const newsegments= segments.filter(e=>e.marker!=='0xFFE1')
    const newexifdata = createDatafromEXIF(exifraw) //add JPG specific headers
    const newfiledata = concatArrayBuffers(newsegments[0].data, newexifdata, ...newsegments.slice(1).map(s=>s.data))  
    return newfiledata
  }



export function exifJPG(arrayBuffer) {
  let filedata=arrayBuffer;
  let exifdata, iccdata, xmldata, exiftags, exifraw;

  function updateExif(){
    if(filedata) {
      const {exif, icc, xml} = jpg_extractEXIF(filedata)
      exifdata=exif
      iccdata=icc
      xmldata=xml
    }
    if(exifdata) {
      exiftags= readEXIFData(exifdata, 10) //10 bytes to skip JPG specific header
      exifraw=exifdata.slice(10) //exif_raw starts with 0x4D4D or 0x4949
    }
    else {exiftags=null;exifraw=null}

    if(iccdata) {
      exiftags = {...exiftags, icc:readICCData(iccdata,18)}
    }

    if(xmldata) {
      const decoder = new TextDecoder();
      const str = decoder.decode(xmldata.slice(4));
      exiftags={...exiftags, xml:str};
    }

  }
  updateExif()

  return {
    load:(arrayBuffer)=>{filedata=arrayBuffer;updateExif();}, //input file's arrayBuffer
    remove:()=>{filedata=jpg_removeEXIF(filedata);updateExif();return filedata}, //returns new file's arrayBuffer
    read:()=>{return {...exiftags,format:'JPG'}}, //returns EXIF tags
    extract:()=>exifraw,
    image:()=>filedata,
    replace:(newexifraw)=>{
      filedata=jpg_replaceEXIF(filedata,newexifraw);
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
          if(!area || !field || value===undefined) return console.error('[MiNi exif]: patch missing input',area,field,value)
          exifraw=editExifData(exiftags, exifraw, area, field, value, value2)
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
      filedata=jpg_replaceEXIF(filedata,exifraw);
      updateExif();
    }
  }
}



