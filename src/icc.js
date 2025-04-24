  import {getStringFromDB} from './tools.js'


  export function readICCData(data, start=0) {
          if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer')
          const dataView = new DataView(data);
          // check signature = 'acsp' at offset 36
          if(dataView.getUint32(start+36) !== 0x61637370) return console.error('[MiNi exif]: ICC missing valid signature')
          const ColorSpace = getStringFromDB(dataView,start+16,4)
          const numOfTags = dataView.getUint32(start+128) //read the TAG TABLE
          let tagsoffset = start+128+4
          let icc = {ColorSpace}
          for (let n=0; n<numOfTags; n++) { //each tag is 12 bytes
            let tsig = getStringFromDB(dataView,tagsoffset,4) //dataView.getUint32(tagsoffset)
            //console.log(n+1,tsig)
            let toffset = dataView.getUint32(tagsoffset+4)
            let tsize = dataView.getUint32(tagsoffset+8) //useless?
            if(tsig === 'desc') { //found 'desc' ... can be either mluc or desc
              tsig='ColorProfile'
              const tag = getStringFromDB(dataView,start+toffset,4) //dataView.getUint32(start+toffset)
              let value = []
              if(tag === 'mluc') { //'mluc' multiLocalizedUnicodeType
                const nrecords = dataView.getUint32(start+toffset+8)
                const nsize = dataView.getUint32(start+toffset+12)
                if(nsize!==0x0C) return console.error('[MiNi exif]: ICC with invalid mluc')
                const roffset = start+toffset+16
                for (let r=0; r<nrecords; r++) { // 12bytes language(2)+country(2)+str length(4)+str offset(4)
                  const strlen = dataView.getUint32(roffset+r*12+4)
                  const stroff = dataView.getUint32(roffset+r*12+8)
                  value.push(getStringFromDB(dataView,start+toffset+stroff, strlen).replaceAll('\x00',''))
                }
                toffset += 28
              } 
              else if (tag === 'desc') { //'desc' 
                tsize = dataView.getUint32(start+toffset+8)
                value.push(getStringFromDB(dataView,start+toffset+12, tsize).replaceAll('\x00',''))
              }
              //console.log(n+1, tsig, tag.toString(16), value)
              icc[tsig] = value
            }
            tagsoffset += 12
          }
          return icc
  }