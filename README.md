# mini-exif
Image metadata READER and EDITOR

Supported metadata: TIFF, EXIF, GPS, ICC(read-only)
Supported file formats: JPG, PNG, HEIC, AVIF, MOV(read-only) 

Pure-javascript, works in Browser and Node.js


### Install
```bash
$ npm install @xdadda/mini-exif
```

### Example
```javascript
import miniExif from '@xdadda/mini-exif'

//select and open an image file
let input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
document.body.appendChild(input);
const ev=await new Promise(r=> {input.onchange=r; input.oncancel=r} );
const file = ev.target.files[0];
const reader= new FileReader();
await new Promise(r=> reader.onload=r, reader.readAsArrayBuffer(file));
const imageAB = reader.result;

//load image's arraybuffer in miniexif
const exif=miniExif(imageAB)

//get image metadata
const tags = exif.read()
//extract EXIF raw data (arraybuffer)
const exifAB = exif.extract()
//entirely remove EXIF metadata from image
exif.remove()
//get updated image's ArrayBuffer
const newimageAB = exif.image()


/* ...load image ArrayBuffer in a canvas and edit it ...      */
/* ...retrieve canvas' ArrayBuffer (will leave it to you) */

const newexif = miniExif(canvasAB)
//insert original image's EXIF in edited canvas' arraybuffer
//Note: replace will insert EXIF metadata if missing/ replace if present
newexif.replace(exifAB)
//patch metadata fields (Note: String fields cannot exceed original field's length)
newexif.patch({area:'tiff',field:'Orientation',value:1})
//in Browser it's possible to download the patched file (obviously not working in Node.js)
newexif.download('newfilename.jpg')
```


### READ metadata
```javascript
const mini = miniExif(ArrayBuffer);
const tags = mini.read();
```
read() returns:
- Object: {
  format: "PNG" | "JPG" | "HEIC" | "AVIF" | "QT",
  exif: { ...fields...  },
  gps: { ... },
  icc: { ... },
  tiff: { ... },
}

Note: some fields will have a 'hvalue' human-readable value, which helps interpret the original metadata 'value'
Note: "QT" stands for Apple quicktime movies


### PATCH metadata
```javascript
mini.edit({area:String, field:String, value:Float|Array, value2:Float|Array})
```

Where:
- area: "exif" | "gps" | "tiff"
- field: area's field to update (eg "Make" field in "tiff" area)
- value: new value
- value2: (optional) is the denominator of a rational field

This function will PATCH data in memory
NOTE: if patching a String field (such as tiff/Make or tiff) the new string can't exceed the original string length




