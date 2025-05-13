import {getStringFromDB} from './tools.js'
const debug=false

// https://fossies.org/linux/Image-ExifTool/lib/Image/ExifTool/QuickTime.pm

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
  // return {icc:{data:,offset},exif:{data:,offset:}}
  export function qt_parseBoxes(data) {
    if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer')
    const datalength = data.byteLength
    const dataView = new DataView(data);

    if(!(dataView.getUint32(4)===0x66747970 && dataView.getUint32(8)===0x71742020))
      return console.error('[MiNi exif]: data is not QuickTime')


    let offset=0
    let keys_array=[], values_array=[]
    while (offset + 4 + 4 <= dataView.byteLength) {
        const box = parseBox(dataView, offset);
        if (box === undefined) break;
        debug&&console.log('>',box)
        if (box.str === 'meta') {
          offset += 12 //let's open it
          continue
        }
        if (box.str === 'moov') {
          const sub = parseSubbox(dataView,box)
          debug&&console.log('moov',sub)
          if(sub.meta){
            const ssub = parseSubbox(dataView,sub.meta)
            debug&&console.log('moov > meta',ssub)

            let keys_num
            if(ssub.keys){
              let keys_offset=ssub.keys.contentOffset
              const keys_length=ssub.length //dataView.getUint32(offset)
              keys_num=dataView.getUint32(keys_offset+4)
              keys_offset=keys_offset+8
              for(let n=0;n<keys_num;n++){
                const key_len=dataView.getUint32(keys_offset)
                const key_tag=dataView.getUint32(keys_offset+4)
                if(key_tag!==0x6D647461) continue //check for 'mdta'
                const key = getStringFromDB(dataView,keys_offset+8,key_len-8)
                keys_array.push(key) //split('.')[3])
                keys_offset+=key_len
              }
              keys_array=keys_array.map(e=>e.replace('com.apple.quicktime.',''))
              debug&&console.log('moov > meta > keys',keys_num,keys_array)
            }
            if(ssub.ilst){
              let data_offset=ssub.ilst.contentOffset
              for(let n=0;n<keys_num;n++){
                const x_len=dataView.getUint32(data_offset)
                const data_len=dataView.getUint32(data_offset+8)
                const data_tag=dataView.getUint32(data_offset+12)
                if(data_tag!==0x64617461) continue //check for 'data'
                const data = getStringFromDB(dataView,data_offset+16+8,data_len-8-8)
                values_array.push({value:data,offset:data_offset+16+8,type:2})
                data_offset+=x_len
              }
              debug&&console.log('moov > meta > ilst',values_array)
            }
          }

        }
        offset += box.length;
    }

    let tags={}
    if(keys_array.length && values_array.length){

        let meta= keys_array.reduce((p,v,i)=>{p[v]=values_array[i];return p},{})
        tags.meta=meta
        if(tags.meta['location.ISO6709']) {
          const gps=tags.meta['location.ISO6709'].value
          tags.gps={GPSLatitude:{value:parseFloat(gps)}, GPSLongitude:{value:parseFloat(gps.slice(8))}, GPSAltitude:{value:parseFloat(gps.slice(17))}}
        }
    }
    debug&&console.log(tags)
    return tags
  }



