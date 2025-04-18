//based on https://github.com/exif-js/exif-js
//evolved to support other formats and patching methods

import {decompressSync} from 'fflate'
var debug = true;

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
  function readTags(file, tiffStart, dirStart, strings, bigEnd) {
      var entries = file.getUint16(dirStart, !bigEnd),
          tags = {},
          entryOffset, tag,
          i;

      for (i = 0; i < entries; i++)
      {
          entryOffset = dirStart + i * 12 + 2;
          tag = strings[file.getUint16(entryOffset, !bigEnd)];
          if(tag) tags[tag] = readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd);
      }
      return tags;
  }

  //const types=['uint8','ascii','uint16','uint32','rational',,'uint8',,'int32','s_rational']
  function readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd) {
      var type = file.getUint16(entryOffset + 2, !bigEnd),
          numValues = file.getUint32(entryOffset + 4, !bigEnd),
          valueOffset = file.getUint32(entryOffset + 8, !bigEnd) + tiffStart,
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
                  val = file.getUint8(offset, !bigEnd);
                  len = 1;
              } else
              {
                  offset = numValues > 4 ? valueOffset : (entryOffset + 8);
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      vals[n] = file.getUint8(offset + n);
                      len++;
                  }
              }
              break;

          case 2: // ascii, 8-bit byte
              offset = numValues > 4 ? valueOffset : (entryOffset + 8);
              vals = getStringFromDB(file, offset, numValues - 1);
              len=vals.length;
              break;

          case 3: // short, 16 bit int
              if (numValues == 1)
              {
                  offset = entryOffset + 8;
                  val = file.getUint16(offset, !bigEnd);
                  len = 2;
              } else
              {
                  offset = numValues > 2 ? valueOffset : (entryOffset + 8);
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      vals[n] = file.getUint16(offset + 2 * n, !bigEnd);
                      len += 2;
                  }
              }
              break;

          case 4: // long, 32 bit int
              if (numValues == 1)
              {
                  offset = entryOffset + 8;
                  val = file.getUint32(offset, !bigEnd);
                  len = 4;
              } else
              {
                  offset = valueOffset;
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      vals[n] = file.getUint32(offset + 4 * n, !bigEnd);
                      len += 4;
                  }
              }
              break;

          case 9: // slong, 32 bit signed int
              if (numValues == 1)
              {
                  offset = entryOffset + 8;
                  val = file.getInt32(offset, !bigEnd);
                  len = 4;
              } else
              {
                  offset = valueOffset;
                  vals = [];
                  len = 0;
                  for (n = 0; n < numValues; n++)
                  {
                      vals[n] = file.getInt32(offset + 4 * n, !bigEnd);
                      len += 4;
                  }
              }
              break;

          case 5:    // rational = two long values, first is numerator, second is denominator
              if (numValues == 1)
              {
                  offset = valueOffset;
                  numerator = file.getUint32(offset, !bigEnd);
                  denominator = file.getUint32(offset + 4, !bigEnd);
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
                      numerator = file.getUint32(offset + 8 * n, !bigEnd);
                      denominator = file.getUint32(offset + 4 + 8 * n, !bigEnd);
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
                  numerator = file.getInt32(offset, !bigEnd);
                  denominator = file.getInt32(offset + 4, !bigEnd);
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
                      numerator = file.getInt32(offset + 8 * n, !bigEnd);
                      denominator = file.getInt32(offset + 4 + 8 * n, !bigEnd);
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

  function getStringFromDB(buffer, start, length) {
      var outstr = "";
      for (var n = start; n < start + length; n++)
      {
          outstr += String.fromCharCode(buffer.getUint8(n));
      }
      return outstr;
  }
//////////////////////////

/////// READ FUNCS ///////
  function readEXIFData(file, start) {
    // https://exiftool.org/TagNames/EXIF.html
    // https://www.media.mit.edu/pia/Research/deepview/exif.html
      var bigEnd,
          tags, tag,
          exifData, gpsData;  
      // test for TIFF validity and endianness
      if (file.getUint16(start) == 0x4949)
      {
          bigEnd = false;
      } else if (file.getUint16(start) == 0x4D4D)
      {
          bigEnd = true;
      } else
      {
          if (debug) console.error("[MiNi exif]: Not valid TIFF data! (no 0x4949 or 0x4D4D)");
          return false;
      }

      if (file.getUint16(start + 2, !bigEnd) != 0x002A)
      {
          if (debug) console.error("[MiNi exif]: Not valid TIFF data! (no 0x002A)");
          return false;
      }

      var firstIFDOffset = file.getUint32(start + 4, !bigEnd);

      if (firstIFDOffset < 0x00000008)
      {
          if (debug) console.error("[MiNi exif]: Not valid TIFF data! (First offset less than 8)", file.getUint32(tiffOffset + 4, !bigEnd));
          return false;
      }
          /*
          //loop through EXIF TAGs
          // TagId  -Type  -Tag count-  -Tag value-
          // A0 03  00 04  00 00 00 01  00 00 05 DD
          // Type: 1 = BYTE, 3 SHORT, 4 LONG, ... 
          */

      tags = {tiff: readTags(file, start, start + firstIFDOffset, TiffTags, bigEnd)};
      //tags.IFD0 = 14-8+firstIFDOffset
      //tags.Orientation_offset += tags.IFD0

      
      if (tags.tiff.ExifIFDPointer)
      {
          exifData = readTags(file, start, start + tags.tiff.ExifIFDPointer.value, ExifTags, bigEnd);
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
          gpsData = readTags(file, start, start + tags.tiff.GPSInfoIFDPointer.value, GPSTags, bigEnd);
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

  function readICCData(dataView, start) {
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

  // support for HEIC/AVIF, JPEG, PNG, Apple Quicktime videos!!
  // @data: is ArrayBuffer
  // @quicktime: not strictly needed, but if set will avoid reading the whole video in memory and will just check the tail chunk/data (if provided by caller) for relevant pointer!
  async function readEXIF(data,quicktime=false) {
      function _appendBuffer(buffer1, buffer2) {
        var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        tmp.set(new Uint8Array(buffer1), 0);
        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
        return tmp.buffer;
      };

    //const data = await readFile(file)
    if(!(data instanceof ArrayBuffer)) return console.error('[MiNi exif]: input must be an ArrayBuffer')
    const datalength = data.byteLength
    const dataView = new DataView(data);
    let tags = {}

    ///// JPEG ////////////////////////////////
    if(dataView.getUint16(0)===0xFFD8 /*&& dataView.getUint16(datalength-2)===0xFFD9*/ ){ //Start of Image
      //console.log('JPG')
      tags.format='JPG'

      //https://www.cipa.jp/std/documents/e/DC-008-2012_E.pdf
      //https://exiftool.org/TagNames/JPEG.html
      // SOI -> APPn (0xFFEn ... 0xFFE1 for EXIF, 0xFFE2 for ICC) -> SOS (0xFFDA start of scan) -> EOI (0xFFD9 end of image)
      // SEGMENTS: FFE1 0124 XXXXXXX -> APP1, size 0x124 (292 bytes)
      const SOS=0xFFDA, APP1=0xFFE1, APP2=0xFFE2, EXIF=0x45786966, ICC='ICC_PROFILE\0'
      let marker=null, offset = 2 //skip SOI
      while (marker !== SOS) {
        let moffset = offset
        marker = dataView.getUint16(moffset)
        const size = dataView.getUint16(moffset + 2)

        //EXIF PARSER
        if (marker === APP1 && dataView.getUint32(moffset + 4) === EXIF) {
          // -- JPEG specific ---------------------  --EXIF-TIFF HEADER ---- METADATA-------
          // -SOI-  -APP1  -size  ----Exif---------  Endian -chk  IFD0 offset*
          // FF D8  FF E1  01 24  45 78 69 66 00 00  4D 4D 00 2A  00 00 00 08 .....
          // * offset from end of EXIF tag/ Endian tag

          /*
          const raw = data.slice(moffset+4,moffset+4+size-2)
          moffset += 10 //HERE starts the EXIF metadata
          tags = {...tags,...readEXIFData(dataView, moffset)}
          tags.exif_raw = raw
          tags.exif_len = tags.exif_raw.byteLength
          tags.exif_offset = moffset+4
          */

          moffset += 10 //HERE starts the EXIF metadata
          tags = {...tags,...readEXIFData(dataView, moffset)}
          const raw = data.slice(moffset,moffset+size-2-6)
          tags.exif_raw = {value:raw, /*len:raw.byteLength,*/ offset:moffset}
          //tags.exif_len = tags.exif_raw.byteLength
          //tags.exif_offset = moffset


        }
        //ICC PARSER
        else if (marker === APP2 && getStringFromDB(dataView,moffset + 4, 12) === ICC) {

          //https://www.color.org/specification/icc1v43_2010-12.pdf
          //https://exiftool.org/TagNames/ICC_Profile.html#Header

          // PROFILE HEADER (128bytes) -> TAG TABLE (Uint32 tag count + 12bytes per TAG*) -> Tagged DATA
          // *each TAG = Uint32 Signature + Uint32 Offset** + Uint32 Size
          // **offset from beginning of profile header
          // -----JPEG specific marker------- -ICC PROFILE starts here-----------------
          // ---- 'ICC_PROFILE/0' ----------- -size------   --CMMtype--  --version-- profileclass  color space  connection   date-time (12bytes)       signature*
          // 4943435F 50524F46 494C4500 01 01 00 00 02 18   61 70 70 6C  04 00 00 00  6D 6E 74 72  52 47 42 20  58 59 5A 20  000000000000000000000000  61 63 73 70
          //  header position starts here -->  0  1  2  3   4 ... for 12 ... signature at offset 36
          
          moffset += 4+12+2 //HERE starts the ICC PROFILE
          tags.icc = readICCData(dataView, moffset)

        }
        // Skip the entire segment (header of 2 bytes + size of the segment)
        offset += 2 + size
      }
    }
    ///// JXL ////////////////////////////////
    else if( (dataView.getUint32(0)===0xC && dataView.getUint32(4)===0x4A584C20) || dataView.getUint32(0)===0xFF0A ){
      tags.format='JXL'

      let offset=0xC

      while (offset < dataView.byteLength) {
          const box = parseBox(dataView, offset);
          if (box === undefined) break;
          //console.log('>',offset,box)
          if(box.str==='Exif'){
            tags = {...tags,...readEXIFData(dataView, box.contentOffset+0x4)}
          }
          else if(box.str==='xml'){
                        
          }
          else if(box.str==='brob'){
            const meta=getStringFromDB(dataView,box.contentOffset,4)
            if(meta==='Exif') {

            }
            else if(meta==='xml'){

            }
          }
          offset += box.length;
      }
    }

    ///// HEIC-AVIF ////////////////////////////////
    else if (dataView.getUint32(4)===0x66747970 && (dataView.getUint32(8)===0x68656963 || dataView.getUint32(8)===0x61766966)) {
      //console.log('HEIC/AVIF')
      tags.format=dataView.getUint32(8)===0x68656963 ? 'HEIC':'AVIF'

      var ftypeSize = dataView.getUint32(0); // size of ftype box
      var metadataSize = dataView.getUint32(ftypeSize); //size of metadata box

      let offset=0, exif_id, infe_num, iloc={}

      while (offset + 4 + 4 <= dataView.byteLength) {
          const box = parseBox(dataView, offset);
          if (box === undefined) break;
          //console.log('>',box)
          if (box.str === 'meta') {
            offset += 12
            continue
          }
          if (box.str === 'iprp') {
            // ICC: iprp > ipco > colr, and then the whole profile is stored there

            // --HEIC specific-- -ICC PROFILE starts here-----------------
            // --- 'colrprof' -- -size------   --CMMtype--  --version-- profileclass  ....
            // 636F6C72 70726F66 00 00 02 18   61 70 70 6C  04 00 00 00  6D 6E 74 72 ....
            //   starts here -->  0  1  2  3
            const sub = parseSubbox(dataView,box)
            if(sub.ipco) {
              const ssub = parseSubbox(dataView,sub.ipco)
              if(ssub.colr) {
                tags.icc = readICCData(dataView, ssub.colr.contentOffset+4)
              }
            }
          }
          else if (box.str === 'iinf') {
            //EXIF: iinf > iloc > exif
            //iinf: serie di 'infe' di 21bytes: infe(4)+xxx(4)+infid(4)+infstr(4)+xxx(5)
            infe_num = dataView.getUint32(box.contentOffset+2)
            let infe_off = box.contentOffset+8+2
            for (let ii=0; ii<infe_num; ii++) {
              //console.log('infe',infe_off,ii+1+'/'+infe_num,getStringFromDB(dataView,infe_off+12,4),  dataView.getUint32(infe_off+8).toString(16) )
              if(getStringFromDB(dataView,infe_off+12,4)==='Exif') {
                  exif_id=dataView.getUint32(infe_off+8)//.toString(16)
                  break
                }
              if(ii<infe_num){
                //find next infe
                infe_off+=16
                while(dataView.getUint32(infe_off)!==0x696E6665 && infe_off<20000) {
                  infe_off++
                }              
              }

              /*
              console.log('infe',ii+1+'/'+infe_num,getStringFromDB(dataView,infe_off+ii*21+12,4),  dataView.getUint32(infe_off+ii*21+8).toString(16) )
              if(getStringFromDB(dataView,infe_off+ii*21+12,4)==='Exif') {
                  console.log('EXIF found id')
                  exif_id=dataView.getUint32(infe_off+ii*21+8)//.toString(16)
                }
              */
            } 
          }
          else if (box.str === 'iloc') {
            //https://github.com/Exiv2/exiv2/issues/2162

            //console.log('ILOC eXIF:',exif_id)
            //iloc: serie di _id(4)+00000001(4)+infoffset(4)+size(4)
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
                //console.log('iloc',ii+1,iloc_id.toString(16),iloc_contentoff.toString(16),iloc_size.toString(16))
                iloc[iloc_id]={id:iloc_id,off:iloc_contentoff,size:iloc_size,type:'heic'}
              }
              else if(iloc_len===18){ //AVIF
                const iloc_id = dataView.getUint32(iloc_off+ii*iloc_len)
                const iloc_contentoff = dataView.getUint32(iloc_off+ii*iloc_len+4)
                const iloc_size = dataView.getUint32(iloc_off+ii*iloc_len+14)
                //console.log('iloc',ii+1,iloc_id.toString(16),iloc_contentoff.toString(16),iloc_size.toString(16))
                iloc[iloc_id]={id:iloc_id,off:iloc_contentoff,size:iloc_size,type:'avif'}
              }
              else console.error('[MiNi exif]: unknown iloc block length',iloc_len)
              /*
              console.log('iloc',ii+1,iloc_id.toString(16),
                                      dataView.getUint32(iloc_off+ii*iloc_len+4).toString(16),
                                      iloc_contentoff.toString(16),
                                      iloc_size.toString(16),
                        )*/
              /*
              if(iloc_id === exif_id) {
                //const exif_off = dataView.getUint32(iloc_off+ii*16+8)+4
                const raw = data.slice(iloc_contentoff+4, iloc_contentoff+4 +iloc_size-4 )
                tags.exif = readEXIFData(dataView, iloc_contentoff+10) 
                tags.exif.raw = raw
                tags.exif.raw_HEIC_offset=iloc_contentoff+10
                tags.exif.raw_HEIC_size=raw.byteLength-6
                tags.exif.raw_HEIC_uint8=new Uint8Array(raw.slice(6))
              }
              */
            } 
          }
          offset += box.length;
      }
      if(exif_id && iloc[exif_id]){
        //console.log(iloc[exif_id])
        const {off,size, type} = iloc[exif_id]
        if(type==='heic'){
          //const exif_off = dataView.getUint32(iloc_off+ii*16+8)+4
          tags = {...tags,...readEXIFData(dataView, off+10)}
          /*
          const raw = data.slice(off+4, off+4+size-4 )
          tags.exif_raw = raw
          tags.exif_len = tags.exif_raw.byteLength
          tags.exif_offset=off+4
          */

          const raw = data.slice(off+4+6, off+4+size-4-6 ) //skip 'Exif  ' header
          tags.exif_raw = {value: raw, /*len: raw.byteLength,*/ offset:off+4+6}
          //tags.exif_len = tags.exif_raw.byteLength
          //tags.exif_offset=off+4+6

        }
        else if(type==='avif'){
          //tags.exif = readEXIFData(dataView, off+4) 
          const raw = data.slice(off+4, off+4 +size-4 )
          tags = {...tags,...readEXIFData(dataView, off+4)}

          /*
          tags.exif_raw = _appendBuffer(new Uint8Array([0x45,0x78,0x69,0x66,0,0]).buffer,raw)
          tags.exif_len = tags.exif_raw.byteLength-6
          tags.exif_offset=off+4-6
          */
          tags.exif_raw = {value: raw, /*len:raw.byteLength,*/ offset:off+4}
          //tags.exif_len = tags.exif_raw.byteLength
          //tags.exif_offset=off+4
        }

      }
    }

    ///// PNG ////////////////////////////////
    else if (dataView.getUint32(0)===0x89504E47 && dataView.getUint32(4)===0x0D0A1A0A) {
      tags.format='PNG'
      //console.log('PNG',dataView) //"\x89PNG\x0d\x0a\x1a\x0a"
      //https://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_PNG_files
      //http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html#C.iCCP
      function readChunk(dataView, offset){
        const len= dataView.getUint32(offset)
        const type= getStringFromDB(dataView,offset+4,4) //dataView.getUint32(offset+4)
        const rawoffset=offset+8
        const raw = data.slice(offset+8,offset+8+len)
        const crc =  dataView.getUint32(offset+8+len)
        return {len,type,raw,rawoffset,crc}
      }

      //FIND ICC
      let offset=8, chunk
      while(chunk?.type!=='iCCP'&&offset<datalength){
        chunk = readChunk(dataView, offset)
        offset+=12+chunk.len
      }
      if(chunk?.type==='iCCP') {
        let byte = true, rawoffset=0, array = new Uint8Array(chunk.raw)
        //skip Profile name
        while(byte!==0){
          byte=array[rawoffset++]
        }
        rawoffset++ //skip Compression method
        array=array.slice(rawoffset)
        const c = decompressSync(new Uint8Array(array))
        tags.icc = readICCData(new DataView(c.buffer),0)
      }

      //FIND EXIF
      offset=8, chunk=null
      while(chunk?.type.toLowerCase()!=='exif'&&offset<datalength){
        chunk = readChunk(dataView, offset)
        offset+=12+chunk.len
      }
      if(chunk?.type.toLowerCase()==='exif') {
        //console.log('exif chunk',chunk)
        tags = {...tags,...readEXIFData(dataView,chunk.rawoffset)}
        /*
        //add EXIF=0x457869660000 to raw to adhere to jpg standard
        tags.exif_raw = _appendBuffer(new Uint8Array([0x45,0x78,0x69,0x66,0,0]).buffer,chunk.raw)
        tags.exif_len = tags.exif_raw.byteLength-6
        */
        tags.exif_raw = {value: chunk.raw, /*len: chunk.raw.byteLength,*/ offset: chunk.rawoffset}
        //tags.exif_len = tags.exif_raw.byteLength
        //tags.exif_offset=chunk.rawoffset
      }

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
          tags.xmp_raw = {value:xmp, /*len:xmp.length,*/ offset:chunk.rawoffset}
          const entries = [...xmp.matchAll(/(?<=<(exif|tiff):)(.*?)>(.*?)</g)] //[...xxx] needed for Safari!
          tags.xmp = {}
          entries.forEach(e=>{
            if(!tags.xmp[e[1]]) tags.xmp[e[1]]={}
            tags.xmp[e[1]][e[2]]={value:e[3],offset:e.index}
          })
        }
      }
    }

    else if(quicktime || (dataView.getUint32(4)===0x66747970 && dataView.getUint32(8)===0x71742020) ){ //checking that file starts with magicstring 'ftypqt  ' at offset 0x4 
      //FIND 'meta' backward
      tags.format='QT'

      let offset=datalength-4, chunk=null
      //read backwards
      while(offset>0 && chunk!== 0x6D657461){ //'meta'
        chunk = dataView.getUint32(offset)
        offset--
      }
      if(offset===datalength) tags.error='MOV missing meta'
      else {
        offset++
        //console.log('found meta',dataView.getUint32(offset+8),)
        //check for 'hdlr' and 'mdta'
        if(dataView.getUint32(offset+8)!==0x68646C72 || dataView.getUint32(offset+20)!==0x6D647461)
          tags.error='MOV missing hdlr or mdta'
        else {
          offset+=dataView.getUint32(offset+4)+4
          //check for 'keys'
          if(dataView.getUint32(offset+4)!==0x6B657973) tags.error='MOV missing keys'
          else {
            const keys_length=dataView.getUint32(offset)
            const keys_num=dataView.getUint32(offset+12)
            let keys_offset=offset+16
            let keys=[]
            for(let n=0;n<keys_num;n++){
              const key_len=dataView.getUint32(keys_offset)
              const key_tag=dataView.getUint32(keys_offset+4)
              if(key_tag!==0x6D647461) continue //check for 'mdta'
              const key = getStringFromDB(dataView,keys_offset+8,key_len-8)
              keys.push(key.split('.')[3])
              keys_offset+=key_len
            }
            //console.log('keys',keys)

            let values=[]
            offset=keys_offset+4
            if(dataView.getUint32(offset)!==0x696C7374) tags.error='MOV missing ilst'
            else {
              offset+=4
              let data_offset=offset
              for(let n=0;n<keys_num;n++){
                const x_len=dataView.getUint32(data_offset)
                const data_len=dataView.getUint32(data_offset+8)
                const data_tag=dataView.getUint32(data_offset+12)
                if(data_tag!==0x64617461) continue //check for 'data'
                const data = getStringFromDB(dataView,data_offset+16+8,data_len-8-8)
                values.push({value:data,offset:data_offset+16+8,type:2,type_str:'ascii'})
                data_offset+=x_len
              }
              //console.log('values',keys,values)
              let exif= keys.reduce((p,v,i)=>{p[v]=values[i];return p},{})
              tags.meta=exif
              if(tags.meta.location) {
                const gps=tags.meta.location.value
                tags.gps={Latitude:parseFloat(gps), Longitude:parseFloat(gps.slice(8)), Altitude:parseFloat(gps.slice(17))}
              }
            }
          }

        }
      }
    }
    else tags.error='unknown format'
    if(tags.error) return console.error('[MiNi exif]: ',tags.error) //

    if(tags.exif_raw) {
      tags.edit = editExifData
      tags.patchBlob = patchBlob
    }
    if(tags.gps) {
      tags.convertDMStoDD = convertDMStoDD
      tags.convertDDToDMS = convertDDToDMS
      tags.convertLatLngToDMS = convertLatLngToDMS
    }
    if(tags.xmp_raw) tags.editXMP = editXMPData
    return tags
    //NOTE: colorspace: 0x0001 = sRGB, 0xffff = uncalibrated (for apple's heic === display-p3)
  }
//////////////////////////

/////// WRITE FUNCS ///////

  // will update this.exif_raw and relevant area/field
  //@area: 'exif','tiff','gps'
  //@field: exif field within the area
  //@newvalue: val or array
  //@newvalue2: val or array (optional) is the denominator of a rational field
  function editExifData(area, field, newvalue, newvalue2){
    let tags=this
    if(!tags || !area || !field || !newvalue) return false
    const areas = ['exif','tiff','gps']
    if(!areas.includes(area)) return console.error('[MiNi exif]: area must be one of',areas);
    if(!tags[area][field]) return console.error("[MiNi exif]: '"+area+"/"+field+"' not present");
    const exifraw = tags.exif_raw.value
    if(!exifraw) return false
    if(newvalue2) {
      if(typeof newvalue !== typeof newvalue2) return console.error('[MiNi exif]: newvalue type mismatch vs newvalue2',newvalue,newvalue2);
      if(Array.isArray(newvalue)){
        let tarr=[]
        for(let n=0; n<newvalue.length; n++){
          let t =new Number(newvalue[n]/newvalue2[n])
          t.numerator=newvalue[n]
          t.denominator=newvalue2[n]
          tarr.push(t)
        }
        newvalue=tarr
      }
      else {
        let t =new Number(newvalue/newvalue2)
        t.numerator=newvalue
        t.denominator=newvalue2
        newvalue=t      
      }
    }

    const item = tags[area][field]
    const numValues = item.value.length || 1
    if(typeof newvalue !== typeof item.value) return console.error('[MiNi exif]: newvalue type mismatch vs oldvalue',item.value,newvalue);
    //newvalue length must not exceed old value length
    if(numValues>1 && (!newvalue.length || newvalue.length<1 || newvalue.length>numValues)) return console.error('[MiNi exif]: newvalue too long',item.value,newvalue); 
    //if newvalue length less than oldvalue pad with 0s
    if(numValues>1 && newvalue.length<numValues) {
      if(Array.isArray(item.value)){
        for(let n=0; n<numValues-newvalue.length; n++){
          newvalue.push(0)
        }      
      }
      else if (typeof item.value === 'string'){
        newvalue = newvalue.concat(' '.repeat(numValues-newvalue.length))
      }
      else return console.error('[MiNi exif]: unknown type',item.value,newvalue);
    }

    const dv = new DataView(exifraw)
    let bigEnd,n
    if (dv.getUint16(0) == 0x4949)
    {
        bigEnd = false;
    } else if (dv.getUint16(0) == 0x4D4D)
    {
        bigEnd = true;
    }
    if(bigEnd===undefined) return console.error('[MiNi exif]: exif_raw corrupted')

    //dv.setUint16(item.offset-tags.exif_offset,1)

    //EDIT item
    const type = item.type
    const offset=item.offset //-tags.exif_offset

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

    //update tags object
    tags.exif_raw.value=exifraw
    const tmp = readEXIFData(dv,0)
    Object.keys(tmp).forEach(e=>{
      tags[e]=tmp[e]
    })
    return tags
  }

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

  //from https://github.com/hMatoba/piexifjs/blob/master/piexif.js
  //@tags obj returned by readEXIF
  //@jpeg can be b64 (data:image/jpeg;base64,...binary...) or straight binary string (without data:image/jpeg;base64 header)
  function writeEXIFtoJPG(tags, jpeg) {
            function pack(mark, array) {
                if (!(array instanceof Array)) {
                    throw new Error("'pack' error. Got invalid type argument.");
                }
                if ((mark.length - 1) != array.length) {
                    throw new Error("'pack' error. " + (mark.length - 1) + " marks, " + array.length + " elements.");
                }

                var littleEndian;
                if (mark[0] == "<") {
                    littleEndian = true;
                } else if (mark[0] == ">") {
                    littleEndian = false;
                } else {
                    throw new Error("");
                }
                var packed = "";
                var p = 1;
                var val = null;
                var c = null;
                var valStr = null;

                while (c = mark[p]) {
                    if (c.toLowerCase() == "b") {
                        val = array[p - 1];
                        if ((c == "b") && (val < 0)) {
                            val += 0x100;
                        }
                        if ((val > 0xff) || (val < 0)) {
                            throw new Error("'pack' error.");
                        } else {
                            valStr = String.fromCharCode(val);
                        }
                    } else if (c == "H") {
                        val = array[p - 1];
                        if ((val > 0xffff) || (val < 0)) {
                            throw new Error("'pack' error.");
                        } else {
                            valStr = String.fromCharCode(Math.floor((val % 0x10000) / 0x100)) +
                                String.fromCharCode(val % 0x100);
                            if (littleEndian) {
                                valStr = valStr.split("").reverse().join("");
                            }
                        }
                    } else if (c.toLowerCase() == "l") {
                        val = array[p - 1];
                        if ((c == "l") && (val < 0)) {
                            val += 0x100000000;
                        }
                        if ((val > 0xffffffff) || (val < 0)) {
                            throw new Error("'pack' error.");
                        } else {
                            valStr = String.fromCharCode(Math.floor(val / 0x1000000)) +
                                String.fromCharCode(Math.floor((val % 0x1000000) / 0x10000)) +
                                String.fromCharCode(Math.floor((val % 0x10000) / 0x100)) +
                                String.fromCharCode(val % 0x100);
                            if (littleEndian) {
                                valStr = valStr.split("").reverse().join("");
                            }
                        }
                    } else {
                        throw new Error("'pack' error.");
                    }

                    packed += valStr;
                    p += 1;
                }

                return packed;
            }
            function unpack(mark, str) {
                if (typeof (str) != "string") {
                    throw new Error("'unpack' error. Got invalid type argument.");
                }
                var l = 0;
                for (var markPointer = 1; markPointer < mark.length; markPointer++) {
                    if (mark[markPointer].toLowerCase() == "b") {
                        l += 1;
                    } else if (mark[markPointer].toLowerCase() == "h") {
                        l += 2;
                    } else if (mark[markPointer].toLowerCase() == "l") {
                        l += 4;
                    } else {
                        throw new Error("'unpack' error. Got invalid mark.");
                    }
                }

                if (l != str.length) {
                    throw new Error("'unpack' error. Mismatch between symbol and string length. " + l + ":" + str.length);
                }

                var littleEndian;
                if (mark[0] == "<") {
                    littleEndian = true;
                } else if (mark[0] == ">") {
                    littleEndian = false;
                } else {
                    throw new Error("'unpack' error.");
                }
                var unpacked = [];
                var strPointer = 0;
                var p = 1;
                var val = null;
                var c = null;
                var length = null;
                var sliced = "";

                while (c = mark[p]) {
                    if (c.toLowerCase() == "b") {
                        length = 1;
                        sliced = str.slice(strPointer, strPointer + length);
                        val = sliced.charCodeAt(0);
                        if ((c == "b") && (val >= 0x80)) {
                            val -= 0x100;
                        }
                    } else if (c == "H") {
                        length = 2;
                        sliced = str.slice(strPointer, strPointer + length);
                        if (littleEndian) {
                            sliced = sliced.split("").reverse().join("");
                        }
                        val = sliced.charCodeAt(0) * 0x100 +
                            sliced.charCodeAt(1);
                    } else if (c.toLowerCase() == "l") {
                        length = 4;
                        sliced = str.slice(strPointer, strPointer + length);
                        if (littleEndian) {
                            sliced = sliced.split("").reverse().join("");
                        }
                        val = sliced.charCodeAt(0) * 0x1000000 +
                            sliced.charCodeAt(1) * 0x10000 +
                            sliced.charCodeAt(2) * 0x100 +
                            sliced.charCodeAt(3);
                        if ((c == "l") && (val >= 0x80000000)) {
                            val -= 0x100000000;
                        }
                    } else {
                        throw new Error("'unpack' error. " + c);
                    }

                    unpacked.push(val);
                    strPointer += length;
                    p += 1;
                }

                return unpacked;
            }
            function splitIntoSegments(data) {
                if (data.slice(0, 2) != "\xff\xd8") {
                    throw new Error("Given data isn't JPEG.");
                }

                var head = 2;
                var segments = ["\xff\xd8"];
                while (true) {
                    if (data.slice(head, head + 2) == "\xff\xda") {
                        segments.push(data.slice(head));
                        break;
                    } else {
                        var length = unpack(">H", data.slice(head + 2, head + 4))[0];
                        var endPoint = head + length + 2;
                        segments.push(data.slice(head, endPoint));
                        head = endPoint;
                    }

                    if (head >= data.length) {
                        throw new Error("Wrong JPEG data.");
                    }
                }
                return segments;
            }
            function mergeSegments(segments, exif) {
                var hasExifSegment = false;
                var additionalAPP1ExifSegments = [];

                segments.forEach(function(segment, i) {
                    // Replace first occurence of APP1:Exif segment
                    if (segment.slice(0, 2) == "\xff\xe1" &&
                        segment.slice(4, 10) == "Exif\x00\x00"
                    ) {
                        if (!hasExifSegment) {
                            segments[i] = exif;
                            hasExifSegment = true;
                        } else {
                            additionalAPP1ExifSegments.unshift(i);
                        }
                    }
                });

                // Remove additional occurences of APP1:Exif segment
                additionalAPP1ExifSegments.forEach(function(segmentIndex) {
                    segments.splice(segmentIndex, 1);
                });

                if (!hasExifSegment && exif) {
                    segments = [segments[0], exif].concat(segments.slice(1));
                }

                return segments.join("");
            }
            function hexarraytoValue(array){
              return array.map((e,i)=>e*Math.pow(16*16,array.length-1-i)).reduce((p,v)=>p+v,0)
            }

          const exifraw = tags?.exif_raw.value
          if(!exifraw) return jpeg

          if(tags.tiff?.Orientation) {
            //EDIT ORIENTATION to 1
            //console.log(tags)
            tags.edit('tiff','Orientation', 1)
          }

          const exifarray = Array.from(new Uint8Array(exifraw))
          let exif = exifarray.map(e=>String.fromCodePoint(e)).join('')

          var b64 = false;
          /*
          if (exif.slice(0, 6) != "\x45\x78\x69\x66\x00\x00") {
              throw new Error("Given data is not exif.");
          }
          */
          if (exif.slice(0, 4) != "\x49\x49\x2A\x00" && exif.slice(0, 4) != "\x4D\x4D\x00\x2A") {
              throw new Error("Given data is not exif.");            
          }
          //append Exif string to data
          exif="\x45\x78\x69\x66\x00\x00"+exif

          if (jpeg.slice(0, 2) == "\xff\xd8") {
          } 
          else if (jpeg.slice(0, 23) == "data:image/jpeg;base64," || jpeg.slice(0, 22) == "data:image/jpg;base64,") {
              jpeg = atob(jpeg.split(",")[1]);
              b64 = true;
          } 
          else {
              throw new Error("Given data is not jpeg.");
          }

          var exifStr = "\xff\xe1" + pack(">H", [exif.length + 2]) + exif;
          var segments = splitIntoSegments(jpeg);
          var new_data = mergeSegments(segments, exifStr);
          if (b64) {
              new_data = "data:image/jpeg;base64," + btoa(new_data);
          }

          return new_data;
  }
///////////////////////////

///// UTILS FUNCS ////

    function replaceString(oldstr,newstr,pos){
        let t = oldstr.slice(0,pos)
        t+=newstr
        t+=oldstr.slice(pos+newstr.length)
        return t
    }
    function replaceSubarray(oldarr,newarr,pos){
        let t = oldarr.slice(0,pos)
        t=t.concat(newarr)
        t=t.concat(oldarr.slice(pos+newarr.length))
        return t
    }
    function convertDMStoDD(array) { //eg new Uint32Array([0x25,0x1,0x30,0x1,0x08A5,0x64])
      return array.reduce((p,v,i)=>{ 
        if(i===0) p+=v/array[i+1]
        if(i===2) p+=v/array[i+1]/60
        if(i===4) p+=v/array[i+1]/3600
        return p
      },0)
    }
    function convertDDToDMS(D, lng) {
      D=parseFloat(D);
      const x = {
        ref: D < 0 ? (lng ? "W" : "S") : lng ? "E" : "N",
        deg: 0 | (D < 0 ? (D = -D) : D),
        min: 0 | (((D += 1e-9) % 1) * 60),
        sec: (0 | (((D * 60) % 1) * 6000)) / 100,
      };
      let tD = new Number(x.deg)
      tD.numerator=x.deg
      tD.denominator=1
      let tM = new Number(x.min)
      tM.numerator=x.min
      tM.denominator=1
      let tS = new Number(x.sec)
      tS.numerator=x.sec*100
      tS.denominator=100
      x.DMS= [tD,tM,tS]
      return x
    }
    function convertLatLngToDMS(lat, lng) {
      return {lat: ConvertDDToDMS(lat,false), lng: ConvertDDToDMS(lng,true)}
    }
//////////////////////

/*
///// FILES FUNCS ////
  async function getFirstBytesfromFile(path,bytesToRead,position=0) {
    try {
      const handle = await open(path, 'r');
      const { buffer } = await handle.read(Buffer.alloc(bytesToRead), 0, bytesToRead, position);
      await handle.close()
      return buffer    
    } catch (err) {
      console.error('[MiNi exif]: read',err)
      return false
    }
  }

  async function getLastBytesfromFile(path,bytesToRead) {
    try {
      const handle = await open(path, 'r');
      const { size } = await handle.stat(path)
      const position = size - bytesToRead; 
      const { buffer } = await handle.read(Buffer.alloc(bytesToRead), 0, bytesToRead, position);
      await handle.close()
      return buffer
    } catch (err) {
      console.error('[MiNi exif]: read',err)
      return false
    }
  }

  async function fetchFile(url){
    try {
      const arraybuffer = await fetch(url).then(r => r.arrayBuffer())
      return arraybuffer
    } catch (err) {
      console.error('[MiNi exif]: fetch',err)
      return false
    }
  }

  async function readFile(file){
    try {
      if(file instanceof ArrayBuffer) return file
      const arraybuffer = await fetch(file).then(r => r.arrayBuffer())
      return arraybuffer
    } catch (err) {
      console.error('[MiNi exif]: fetch',err)
      return false
    }
  }    
//////////////////////
*/

export {readEXIF, writeEXIFtoJPG}


/*
MOV quicktime apple iphone videos

- 00 00 02 15: length of whole meta including this 4 bytes
- 6D 65 74 61: ‘meta’

- 00 00 00 22: 
- 68 64 6C 72: ‘hdlr’
- 00 00 00 00
- 00 00 00 00
- 6D 64 74 61: ‘mdta’
- 00 00 00 00
- 00 00 00 00
- 00 00 00 00
- 00

    - 00 00 01 10: length of keys segments including this 4 bytes
    - 6B 65 79 73: ‘keys’
    - 00 00 00 00
    - 00 00 00 06: number of keys present
keys:
        - 00 00 00 38: length of key1 including this 4 bytes
        - 6D 64 74 61: ‘mdta’
        - … 30 bytes  : ‘com.apple.quicktime.location.accuracy.horizontal’

        - 00 00 00 2C:  length of key2 including this 4 bytes
        - 6D 64 74 61: ‘mdta’
        - … 30 bytes  : ‘com.apple.quicktime.location.ISO6709’

        - 00 00 00 20:  length of key3 including this 4 bytes
        - 6D 64 74 61: ‘mdta’
        - … 30 bytes  : ‘com.apple.quicktime.make’

          ‘com.apple.quicktime.model’
          ‘com.apple.quicktime.software’
          ‘com.apple.quicktime.creationdate’


    - 00 00 00 EA: length of ilist segments including this 4 bytes
    - 69 6C 73 74: ‘ilst’
each segment:
  -   00 00 00 20: length of segment including this 4 bytes
        - 00 00 00 04: sequential number indicating segment
        - 00 00 00 18: data length including this 4 bytes
        - 64 61 74 61: ‘data’
        - xx xx xx xx
        - xx xx xx xx


*/