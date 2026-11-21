import exifr from "exifr";

export async function inspectImage(file){
    const metadata = await exifr.parse(file, {gps:true; exif:true; xmp:true; iptc:true});
    return metadata ?? {};
}