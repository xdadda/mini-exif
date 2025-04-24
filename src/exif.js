// readEXIFData based on https://github.com/exif-js/exif-js
const debug=true

import {getStringFromDB} from './tools.js'

/////// TAGS /////////////
  // https://exiftool.org/TagNames/EXIF.html
  var TiffTags = {
      0x0100: "ImageWidth",
      0x0101: "ImageHeight",
      0x8769: "ExifIFDPointer",
      0x8773: "ICCProfileIFDPointer",
      0x8825: "GPSInfoIFDPointer",
      0x0102: "BitsPerSample",
      0x0103: "Compression",
      0x0106: "PhotometricInterpretation",
      0x0112: "Orientation",
      0x0115: "SamplesPerPixel",
      0x011C: "PlanarConfiguration",
      0x0212: "YCbCrSubSampling",
      0x0213: "YCbCrPositioning",
      0x011A: "XResolution",
      0x011B: "YResolution",
      0x0128: "ResolutionUnit",
      0x0111: "StripOffsets",
      0x0116: "RowsPerStrip",
      0x0117: "StripByteCounts",
      0x0201: "JPEGInterchangeFormat",
      0x0202: "JPEGInterchangeFormatLength",
      0x012D: "TransferFunction",
      0x013E: "WhitePoint",
      0x013F: "PrimaryChromaticities",
      0x0211: "YCbCrCoefficients",
      0x0214: "ReferenceBlackWhite",
      0x0132: "DateTime",
      0x010E: "ImageDescription",
      0x010F: "Make",
      0x0110: "Model",
      0x0131: "Software",
      0x013B: "Artist",
      0x013C: "HostComputer",
      0x8298: "Copyright"
  };

  var ExifTags = {

      // version tags
      0x9000: "ExifVersion",             // EXIF version
      0xA000: "FlashpixVersion",         // Flashpix format version

      // colorspace tags
      0xA001: "ColorSpace",              // Color space information tag (0x1 sRGB, 0xFFFF uncalibrated)

      // image configuration
      0xA002: "PixelXDimension",         // Valid width of meaningful image
      0xA003: "PixelYDimension",         // Valid height of meaningful image
      0x9101: "ComponentsConfiguration", // Information about channels
      0x9102: "CompressedBitsPerPixel",  // Compressed bits per pixel

      // user information
      //0x927C: "MakerNote",               // Any desired information written by the manufacturer
      //0x9286: "UserComment",             // Comments by user

      // related file
      0xA004: "RelatedSoundFile",        // Name of related sound file

      // date and time
      0x9003: "DateTimeOriginal",        // Date and time when the original image was generated
      0x9004: "DateTimeDigitized",       // Date and time when the image was stored digitally
      0x9290: "SubsecTime",              // Fractions of seconds for DateTime
      0x9291: "SubsecTimeOriginal",      // Fractions of seconds for DateTimeOriginal
      0x9292: "SubsecTimeDigitized",     // Fractions of seconds for DateTimeDigitized

      // picture-taking conditions
      0x829A: "ExposureTime",            // Exposure time (in seconds)
      0x829D: "FNumber",                 // F number
      0x8822: "ExposureProgram",         // Exposure program
      0x8824: "SpectralSensitivity",     // Spectral sensitivity
      0x8827: "ISOSpeedRatings",         // ISO speed rating
      0x8828: "OECF",                    // Optoelectric conversion factor
      0x9201: "ShutterSpeedValue",       // Shutter speed
      0x9202: "ApertureValue",           // Lens aperture
      0x9203: "BrightnessValue",         // Value of brightness
      0x9204: "ExposureBias",            // Exposure bias
      0x9205: "MaxApertureValue",        // Smallest F number of lens
      0x9206: "SubjectDistance",         // Distance to subject in meters
      0x9207: "MeteringMode",            // Metering mode
      0x9208: "LightSource",             // Kind of light source
      0x9209: "Flash",                   // Flash status
      0x9214: "SubjectArea",             // Location and area of main subject
      0x920A: "FocalLength",             // Focal length of the lens in mm
      0xA20B: "FlashEnergy",             // Strobe energy in BCPS
      0xA20C: "SpatialFrequencyResponse",    //
      0xA20E: "FocalPlaneXResolution",   // Number of pixels in width direction per FocalPlaneResolutionUnit
      0xA20F: "FocalPlaneYResolution",   // Number of pixels in height direction per FocalPlaneResolutionUnit
      0xA210: "FocalPlaneResolutionUnit",    // Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
      0xA214: "SubjectLocation",         // Location of subject in image
      0xA215: "ExposureIndex",           // Exposure index selected on camera
      0xA217: "SensingMethod",           // Image sensor type
      0xA300: "FileSource",              // Image source (3 == DSC)
      0xA301: "SceneType",               // Scene type (1 == directly photographed)
      0xA302: "CFAPattern",              // Color filter array geometric pattern
      0xA401: "CustomRendered",          // Special processing
      0xA402: "ExposureMode",            // Exposure mode
      0xA403: "WhiteBalance",            // 1 = auto white balance, 2 = manual
      0xA404: "DigitalZoomRation",       // Digital zoom ratio
      0xA405: "FocalLengthIn35mmFilm",   // Equivalent foacl length assuming 35mm film camera (in mm)
      0xA406: "SceneCaptureType",        // Type of scene
      0xA407: "GainControl",             // Degree of overall image gain adjustment
      0xA408: "Contrast",                // Direction of contrast processing applied by camera
      0xA409: "Saturation",              // Direction of saturation processing applied by camera
      0xA40A: "Sharpness",               // Direction of sharpness processing applied by camera
      0xA40B: "DeviceSettingDescription",    //
      0xA40C: "SubjectDistanceRange",    // Distance to subject
      0xA433: "LensMake",              // 
      0xA434: "LensModel",              // 

      // other tags
      //0xA005: "InteroperabilityIFDPointer",
      0xA420: "ImageUniqueID"            // Identifier assigned uniquely to each image
  };

  var GPSTags = {
      0x0000: "GPSVersionID",
      0x0001: "GPSLatitudeRef",
      0x0002: "GPSLatitude",
      0x0003: "GPSLongitudeRef",
      0x0004: "GPSLongitude",
      0x0005: "GPSAltitudeRef",
      0x0006: "GPSAltitude",
      0x0007: "GPSTimeStamp",
      0x0008: "GPSSatellites",
      0x0009: "GPSStatus",
      0x000A: "GPSMeasureMode",
      0x000B: "GPSDOP",
      0x000C: "GPSSpeedRef",
      0x000D: "GPSSpeed",
      0x000E: "GPSTrackRef",
      0x000F: "GPSTrack",
      0x0010: "GPSImgDirectionRef",
      0x0011: "GPSImgDirection",
      0x0012: "GPSMapDatum",
      0x0013: "GPSDestLatitudeRef",
      0x0014: "GPSDestLatitude",
      0x0015: "GPSDestLongitudeRef",
      0x0016: "GPSDestLongitude",
      0x0017: "GPSDestBearingRef",
      0x0018: "GPSDestBearing",
      0x0019: "GPSDestDistanceRef",
      0x001A: "GPSDestDistance",
      0x001B: "GPSProcessingMethod",
      0x001C: "GPSAreaInformation",
      0x001D: "GPSDateStamp",
      0x001E: "GPSDifferential"
  };

  var StringValues = {
      ExposureMode:{
        0:'Auto',
        1:'Manual',
        2:'Auto Bracket',
      },
      ExposureProgram: {
          0: "Not defined",
          1: "Manual",
          2: "Normal program",
          3: "Aperture priority",
          4: "Shutter priority",
          5: "Creative program",
          6: "Action program",
          7: "Portrait mode",
          8: "Landscape mode"
      },
      MeteringMode: {
          0: "Unknown",
          1: "Average",
          2: "CenterWeightedAverage",
          3: "Spot",
          4: "MultiSpot",
          5: "Pattern",
          6: "Partial",
          255: "Other"
      },
      LightSource: {
          0: "Unknown",
          1: "Daylight",
          2: "Fluorescent",
          3: "Tungsten (incandescent light)",
          4: "Flash",
          9: "Fine weather",
          10: "Cloudy weather",
          11: "Shade",
          12: "Daylight fluorescent (D 5700 - 7100K)",
          13: "Day white fluorescent (N 4600 - 5400K)",
          14: "Cool white fluorescent (W 3900 - 4500K)",
          15: "White fluorescent (WW 3200 - 3700K)",
          17: "Standard light A",
          18: "Standard light B",
          19: "Standard light C",
          20: "D55",
          21: "D65",
          22: "D75",
          23: "D50",
          24: "ISO studio tungsten",
          255: "Other"
      },
      Flash: {
          0x0000: "Flash did not fire",
          0x0001: "Flash fired",
          0x0005: "Strobe return light not detected",
          0x0007: "Strobe return light detected",
          0x0009: "Flash fired, compulsory flash mode",
          0x000D: "Flash fired, compulsory flash mode, return light not detected",
          0x000F: "Flash fired, compulsory flash mode, return light detected",
          0x0010: "Flash did not fire, compulsory flash mode",
          0x0018: "Flash did not fire, auto mode",
          0x0019: "Flash fired, auto mode",
          0x001D: "Flash fired, auto mode, return light not detected",
          0x001F: "Flash fired, auto mode, return light detected",
          0x0020: "No flash function",
          0x0041: "Flash fired, red-eye reduction mode",
          0x0045: "Flash fired, red-eye reduction mode, return light not detected",
          0x0047: "Flash fired, red-eye reduction mode, return light detected",
          0x0049: "Flash fired, compulsory flash mode, red-eye reduction mode",
          0x004D: "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
          0x004F: "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
          0x0059: "Flash fired, auto mode, red-eye reduction mode",
          0x005D: "Flash fired, auto mode, return light not detected, red-eye reduction mode",
          0x005F: "Flash fired, auto mode, return light detected, red-eye reduction mode"
      },
      SensingMethod: {
          1: "Not defined",
          2: "One-chip color area sensor",
          3: "Two-chip color area sensor",
          4: "Three-chip color area sensor",
          5: "Color sequential area sensor",
          7: "Trilinear sensor",
          8: "Color sequential linear sensor"
      },
      SceneCaptureType: {
          0: "Standard",
          1: "Landscape",
          2: "Portrait",
          3: "Night scene"
      },
      SceneType: {
          1: "Directly photographed"
      },
      CustomRendered: {
          0: "Normal process",
          1: "Custom process"
      },
      WhiteBalance: {
          0: "Auto white balance",
          1: "Manual white balance"
      },
      GainControl: {
          0: "None",
          1: "Low gain up",
          2: "High gain up",
          3: "Low gain down",
          4: "High gain down"
      },
      Contrast: {
          0: "Normal",
          1: "Soft",
          2: "Hard"
      },
      Saturation: {
          0: "Normal",
          1: "Low saturation",
          2: "High saturation"
      },
      Sharpness: {
          0: "Normal",
          1: "Soft",
          2: "Hard"
      },
      SubjectDistanceRange: {
          0: "Unknown",
          1: "Macro",
          2: "Close view",
          3: "Distant view"
      },
      FileSource: {
          3: "DSC"
      },
      Components: {
          0: "",
          1: "Y",
          2: "Cb",
          3: "Cr",
          4: "R",
          5: "G",
          6: "B"
      },
      ColorSpace: {
        0x1: 'sRGB',
        0x2: 'Adobe RGB',
        0xfffd: 'Wide Gamut RGB',
        0xfffe: 'ICC Profile',
        0xffff: 'Uncalibrated'
      }
  };
//////////////////////////

/////// TAGS FUNCS ///////
  function readTags(dataView, tiffStart, dirStart, strings, bigEnd) {
      var entries = dataView.getUint16(dirStart, !bigEnd),
          tags = {},
          entryOffset, tag,
          i;
      //console.log('>start',dirStart)
      for (i = 0; i < entries; i++)
      {
          entryOffset = dirStart + i * 12 + 2;
          const taghex=dataView.getUint16(entryOffset, !bigEnd)
          tag = strings[taghex];
          //console.log('>>>',i+1+'/'+entries, (entryOffset-tiffStart).toString(16)?.toUpperCase().padStart(6,'0x00'),taghex.toString(16)?.toUpperCase().padStart(6,'0x'),tag)
          if(tag) tags[tag] = readTagValue(dataView, entryOffset, tiffStart, dirStart, bigEnd);
          //if(tag) console.log(tags[tag])
      }
      return tags;
  }

  //const types=['uint8','ascii','uint16','uint32','rational',,'uint8',,'int32','s_rational']
  function readTagValue(dataView, entryOffset, tiffStart, dirStart, bigEnd) {
      var type = dataView.getUint16(entryOffset + 2, !bigEnd),
          numValues = dataView.getUint32(entryOffset + 4, !bigEnd),
          valueOffset = dataView.getUint32(entryOffset + 8, !bigEnd) + tiffStart,
          offset,
          vals, val, n, len,
          numerator, denominator;

      switch (type)
      {
          case 1: // byte, 8-bit unsigned int
          case 7: // undefined, 8-bit byte, value depending on field
              if (numValues == 1)
              {
                  offset = entryOffset + 8;
                  val = dataView.getUint8(offset, !bigEnd);
                  len = 1;
              } else
              {
                  offset = numValues > 4 ? valueOffset : (entryOffset + 8);
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      vals[n] = dataView.getUint8(offset + n);
                      len++;
                  }
              }
              break;

          case 2: // ascii, 8-bit byte
              offset = numValues > 4 ? valueOffset : (entryOffset + 8);
              vals = getStringFromDB(dataView, offset, numValues - 1);
              len=vals.length;
              break;

          case 3: // short, 16 bit int
              if (numValues == 1)
              {
                  offset = entryOffset + 8;
                  val = dataView.getUint16(offset, !bigEnd);
                  len = 2;
              } else
              {
                  offset = numValues > 2 ? valueOffset : (entryOffset + 8);
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      vals[n] = dataView.getUint16(offset + 2 * n, !bigEnd);
                      len += 2;
                  }
              }
              break;

          case 4: // long, 32 bit int
              if (numValues == 1)
              {
                  offset = entryOffset + 8;
                  val = dataView.getUint32(offset, !bigEnd);
                  len = 4;
              } else
              {
                  offset = valueOffset;
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      vals[n] = dataView.getUint32(offset + 4 * n, !bigEnd);
                      len += 4;
                  }
              }
              break;

          case 9: // slong, 32 bit signed int
              if (numValues == 1)
              {
                  offset = entryOffset + 8;
                  val = dataView.getInt32(offset, !bigEnd);
                  len = 4;
              } else
              {
                  offset = valueOffset;
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      vals[n] = dataView.getInt32(offset + 4 * n, !bigEnd);
                      len += 4;
                  }
              }
              break;

          case 5:    // rational = two long values, first is numerator, second is denominator
              if (numValues == 1)
              {
                  offset = valueOffset;
                  numerator = dataView.getUint32(offset, !bigEnd);
                  denominator = dataView.getUint32(offset + 4, !bigEnd);
                  val = new Number(numerator / denominator);
                  val.numerator = numerator;
                  val.denominator = denominator;
                  len = 8;
              } else
              {
                  offset = valueOffset;
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      numerator = dataView.getUint32(offset + 8 * n, !bigEnd);
                      denominator = dataView.getUint32(offset + 4 + 8 * n, !bigEnd);
                      vals[n] = new Number(numerator / denominator);
                      vals[n].numerator = numerator;
                      vals[n].denominator = denominator;
                      len += 8;
                  }
              }
              break;



          case 10: // signed rational, two slongs, first is numerator, second is denominator
              if (numValues == 1)
              {
                  offset = valueOffset;
                  numerator = dataView.getInt32(offset, !bigEnd);
                  denominator = dataView.getInt32(offset + 4, !bigEnd);
                  val = new Number(numerator / denominator);
                  val.numerator = numerator;
                  val.denominator = denominator;
                  len = 8;
              } else
              {
                  offset=valueOffset;
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      numerator = dataView.getInt32(offset + 8 * n, !bigEnd);
                      denominator = dataView.getInt32(offset + 4 + 8 * n, !bigEnd);
                      vals[n] = new Number(numerator / denominator);
                      vals[n].numerator = numerator;
                      vals[n].denominator = denominator;
                      len += 8;
                  }
              }
              break;
      }
      if(type) return { value:vals||val, offset:offset-tiffStart, type, /*len, type_str:types[type-1]*/ }
  }
//////////////////////////

/////// READ FUNCS ///////
  /****
    data is ArrayBuffer
    start points to 0x4949 or 0x4D4D
    returns {
      exif:{ 
        field: {
          value:..., 
          hvalue:..., //human readable value
          offset:..., //offset relative to start
      }
    }
  ****/
  export function readEXIFData(data, start=0) {

    // https://www.media.mit.edu/pia/Research/deepview/exif.html
    // https://web.archive.org/web/20190624045241if_/http://www.cipa.jp:80/std/documents/e/DC-008-Translation-2019-E.pdf
    // Exif identifier code (eg eXIf) + 
    // TIFF Header + 0th IFD + 0th IFD value + 1st IFD + 1st IFD value + 1st IFD Image Data
    // 
      if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer');
      var bigEnd,
          tags, tag,
          exifData, gpsData;  
      const dataView = new DataView(data);

      // test for TIFF validity and endianness
      if (dataView.getUint16(start) == 0x4949)
      {
          bigEnd = false;
      } else if (dataView.getUint16(start) == 0x4D4D)
      {
          bigEnd = true;
      } else
      {
          if (debug) console.error("[MiNi exif]: Not valid TIFF data! (no 0x4949 or 0x4D4D)");
          return false;
      }

      if (dataView.getUint16(start + 2, !bigEnd) != 0x002A)
      {
          if (debug) console.error("[MiNi exif]: Not valid TIFF data! (no 0x002A)");
          return false;
      }

      var firstIFDOffset = dataView.getUint32(start + 4, !bigEnd);

      if (firstIFDOffset < 0x00000008)
      {
          if (debug) console.error("[MiNi exif]: Not valid TIFF data! (First offset less than 8)", dataView.getUint32(tiffOffset + 4, !bigEnd));
          return false;
      }
          /*
          //loop through EXIF TAGs
          // TagId  -Type  -Tag count-  -Tag value-
          // A0 03  00 04  00 00 00 01  00 00 05 DD
          // Type: 1 = BYTE, 3 SHORT, 4 LONG, ... 
          */

      tags = {tiff: readTags(dataView, start, start + firstIFDOffset, TiffTags, bigEnd)};
      //tags.IFD0 = 14-8+firstIFDOffset
      //tags.Orientation_offset += tags.IFD0

      
      if (tags.tiff.ExifIFDPointer)
      {
          exifData = readTags(dataView, start, start + tags.tiff.ExifIFDPointer.value, ExifTags, bigEnd);
          for (tag in exifData)
          {
              switch (tag)
              {
                  case "LightSource":
                  case "Flash":
                  case "MeteringMode":
                  case "ExposureMode":
                  case "ExposureProgram":
                  case "SensingMethod":
                  case "SceneCaptureType":
                  case "SceneType":
                  case "CustomRendered":
                  case "WhiteBalance":
                  case "GainControl":
                  case "Contrast":
                  case "Saturation":
                  case "Sharpness":
                  case "SubjectDistanceRange":
                  case "FileSource":
                  case "ColorSpace":
                      exifData[tag].hvalue = StringValues[tag][exifData[tag].value];
                      break;
                  case "ExposureTime":
                      exifData[tag].hvalue = exifData[tag].value.numerator+'/'+exifData[tag].value.denominator
                      break;
                  case "ShutterSpeedValue":
                      exifData[tag].hvalue =  '1/'+Math.round(Math.pow(2,exifData[tag].value))
                      break;
                  case "ExifVersion":
                  case "FlashpixVersion":
                      exifData[tag].hvalue = String.fromCharCode(exifData[tag].value[0], exifData[tag].value[1], exifData[tag].value[2], exifData[tag].value[3]);
                      break;
                  case "ApertureValue":
                  case "BrightnessValue":
                      exifData[tag].hvalue = Math.round(exifData[tag].value*1000)/1000;
                      break;
                  case "ComponentsConfiguration":
                      exifData[tag].hvalue =
                          StringValues.Components[exifData[tag].value[0]] +
                          StringValues.Components[exifData[tag].value[1]] +
                          StringValues.Components[exifData[tag].value[2]] +
                          StringValues.Components[exifData[tag].value[3]];
                      break;
              }
          }
          tags.exif=exifData;
          delete tags.tiff.ExifIFDPointer;
      }
      
      
      if (tags.tiff.GPSInfoIFDPointer)
      {
          gpsData = readTags(dataView, start, start + tags.tiff.GPSInfoIFDPointer.value, GPSTags, bigEnd);
          for (tag in gpsData)
          {
              switch (tag)
              {
                  case "GPSVersionID":
                      gpsData[tag].hvalue = gpsData[tag].value[0] +
                          "." + gpsData[tag].value[1] +
                          "." + gpsData[tag].value[2] +
                          "." + gpsData[tag].value[3];
                      break;
                  //ADDED
                  case "GPSLatitude":
                      gpsData[tag].hvalue = gpsData[tag].value[0]+gpsData[tag].value[1]/60+gpsData[tag].value[2]/3600;
                      gpsData[tag].hvalue = (gpsData.GPSLatitudeRef.value==="N"?1:-1)*gpsData[tag].hvalue
                      break;
                  case "GPSLongitude":
                      gpsData[tag].hvalue = gpsData[tag].value[0]+gpsData[tag].value[1]/60+gpsData[tag].value[2]/3600;
                      gpsData[tag].hvalue = (gpsData.GPSLongitudeRef.value==="E"?1:-1)*gpsData[tag].hvalue
                      break;
                  case "GPSTimeStamp":
                      gpsData[tag].hvalue = gpsData[tag].value[0].toString().padStart(2,'0')+':'+
                                            gpsData[tag].value[1].toString().padStart(2,'0')+':'+
                                            gpsData[tag].value[2].toString().padStart(2,'0')+' UTC'
                      break;
              }
          }
          tags.gps=gpsData;
          delete tags.tiff.GPSInfoIFDPointer;
      }
      

      return tags;
  }
//////////////////////////

/////// WRITE FUNCS ///////

  // will update this.exif_raw and relevant area/field
  //@area: 'exif','tiff','gps'
  //@field: exif field within the area
  //@newvalue: val or array
  //@newvalue2: val or array (optional) is the denominator of a rational field
  export function editExifData(tags,exifraw, area, field, newvalue, newvalue2){
    if(!tags || !area || !field || !newvalue || !exifraw) return false;
    const areas = ['exif','tiff','gps'];

    if(!areas.includes(area)) return console.error('[MiNi exif]: area must be one of',areas);
    if(!tags[area][field]) return console.error("[MiNi exif]: '"+area+"/"+field+"' not present");
    //const exifraw = tags.exif_raw
    if(!exifraw) return false;
    if(newvalue2) {
      if(typeof newvalue !== typeof newvalue2) return console.error('[MiNi exif]: newvalue type mismatch vs newvalue2',newvalue,newvalue2);
      if(Array.isArray(newvalue)){
        let tarr=[];
        for(let n=0; n<newvalue.length; n++){
          let t =new Number(newvalue[n]/newvalue2[n]);
          t.numerator=newvalue[n];
          t.denominator=newvalue2[n];
          tarr.push(t);
        }
        newvalue=tarr;
      }
      else {
        let t =new Number(newvalue/newvalue2);
        t.numerator=newvalue;
        t.denominator=newvalue2;
        newvalue=t;
      }
    }

    const item = tags[area][field];
    const numValues = item.value.length || 1;
    if(typeof newvalue !== typeof item.value) return console.error('[MiNi exif]: newvalue type mismatch vs oldvalue',item.value,newvalue);
    //newvalue length must not exceed old value length
    if(numValues>1 && (!newvalue.length || newvalue.length<1 || newvalue.length>numValues)) return console.error('[MiNi exif]: newvalue too long',item.value,newvalue); 
    //if newvalue length less than oldvalue pad with 0s
    if(numValues>1 && newvalue.length<numValues) {
      if(Array.isArray(item.value)){
        for(let n=0; n<numValues-newvalue.length; n++){
          newvalue.push(0);
        }      
      }
      else if (typeof item.value === 'string'){
        newvalue = newvalue.concat(' '.repeat(numValues-newvalue.length));
      }
      else return console.error('[MiNi exif]: unknown type',item.value,newvalue);
    }

    const dv = new DataView(exifraw);
    let bigEnd,n;
    if (dv.getUint16(0) == 0x4949)
    {
        bigEnd = false;
    } else if (dv.getUint16(0) == 0x4D4D)
    {
        bigEnd = true;
    }
    if(bigEnd===undefined) return console.error('[MiNi exif]: exif_raw corrupted');

    //EDIT item
    const type = item.type;
    const offset=item.offset;

        switch (type)
        {
            case 1: // byte, 8-bit unsigned int
            case 7: // undefined, 8-bit byte, value depending on field
                if (numValues == 1)
                {
                    dv.setUint8(offset, newvalue, !bigEnd);
                } else
                {
                    for (n = 0; n < numValues; n++)
                    {
                        dv.setUint8(offset + n, newvalue[n], !bigEnd);
                    }
                }
                break;

            case 2: // ascii, 8-bit byte
                //setString
                  for (n = 0; n < numValues; n++)
                  {
                      dv.setUint8(offset + n, newvalue.charCodeAt(n), !bigEnd);
                  }
                break;

            case 3: // short, 16 bit int
                if (numValues == 1)
                {
                    dv.setUint16(offset, newvalue, !bigEnd);
                } else
                {
                    for (n = 0; n < numValues; n++)
                    {
                        dv.setUint16(offset + n, newvalue[n], !bigEnd);
                    }
                }
                break;

            case 4: // long, 32 bit int
                if (numValues == 1)
                {
                    dv.setUint32(offset, newvalue, !bigEnd);
                } else
                {
                    for (n = 0; n < numValues; n++)
                    {
                        dv.setUint32(offset + n, newvalue[n], !bigEnd);
                    }
                }
                break;

            case 9: // slong, 32 bit signed int
                if (numValues == 1)
                {
                    dv.setInt32(offset, newvalue, !bigEnd);
                } else
                {
                    for (n = 0; n < numValues; n++)
                    {
                        dv.setInt32(offset + n, newvalue[n], !bigEnd);
                    }
                }
                break;

            case 5:    // rational = two long values, first is numerator, second is denominator

                if (numValues == 1)
                {
                    dv.setUint32(offset, newvalue.numerator, !bigEnd);
                    dv.setUint32(offset+4, newvalue.denominator, !bigEnd);
                } else
                {
                    for (n = 0; n < numValues; n++)
                    {
                      dv.setUint32(offset + 8 * n, newvalue[n].numerator, !bigEnd);
                      dv.setUint32(offset + 4 + 8 * n, newvalue[n].denominator, !bigEnd);
                    }
                }
                break;

            case 10: // signed rational, two slongs, first is numerator, second is denominator
                if (numValues == 1)
                {
                    dv.setInt32(offset, newvalue.numerator, !bigEnd);
                    dv.setInt32(offset+4, newvalue.denominator, !bigEnd);
                } else
                {
                    for (n = 0; n < numValues; n++)
                    {
                      dv.setInt32(offset + 8 * n, newvalue[n].numerator, !bigEnd);
                      dv.setInt32(offset + 4 + 8 * n, newvalue[n].denominator, !bigEnd);
                    }
                }
                break;
        }

    return exifraw;
  }

/*
  function editXMPData(area, field, newvalue){
    let tags=this
    if(!tags || !tags.xmp || !area || !field || !newvalue) return false
    if(!tags.xmp_raw?.value) return false
    const areas = ['exif','tiff']
    if(!areas.includes(area)) return console.error('[MiNi exif]: area must be one of',areas);
    if(!tags.xmp[area][field]) return console.error("[MiNi exif]: 'XMP/"+area+"/"+field+"' not present");

    const item = tags.xmp[area][field]
    const offset = item.offset+area.length+1

    if(typeof newvalue !== typeof item.value) return console.error('[MiNi exif]: newvalue type mismatch vs oldvalue',item.value,newvalue);
    if(newvalue.length>item.value.length) return console.error('[MiNi exif]: newvalue too long',item.value,newvalue); 
    if(newvalue.length<item.value.length) {
      newvalue = newvalue.concat(' '.repeat(item.value.length-newvalue.length))
    }
    tags.xmp[area][field].value=newvalue
    tags.xmp_raw.value = replaceString(tags.xmp_raw.value,newvalue,offset)
    return tags
  }

  async function patchBlob(blob){
    try{
          let imagearr = Array.from(new Uint8Array(await blob.arrayBuffer())) //.map(e=>String.fromCodePoint(e)).join('')
          const meta=this
          if(meta.exif_raw){
            //replace EXIF
            const exifarr = Array.from(new Uint8Array(meta.exif_raw.value)) //.map(e=>String.fromCodePoint(e)).join('')
            imagearr = replaceSubarray(imagearr, exifarr, meta.exif_raw.offset)
          }
          if(meta.xmp_raw){
            //replace XMP 
            let xmparr = []
            for(let n=0; n<meta.xmp_raw.value.length; n++) xmparr.push(meta.xmp_raw.value.charCodeAt(n))
            imagearr = replaceSubarray(imagearr, xmparr, meta.xmp_raw.offset)
          }

          const newblob = new Blob([new Uint8Array(imagearr)])
          return newblob

    }
    catch(error){
      console.error('[MiNi exif]: patchBlob',error)
    }
  }
*/
///////////////////////////

