import { makeMap } from './makeMap'

/**
 * On the client we only need to offer special cases for boolean attributes that
 * have different names from their corresponding dom properties:
 * - itemscope -> N/A
 * - allowfullscreen -> allowFullscreen
 * - formnovalidate -> formNoValidate
 * - ismap -> isMap
 * - nomodule -> noModule
 * - novalidate -> noValidate
 * - readonly -> readOnly
 */
const specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`
export const isSpecialBooleanAttr = /*#__PURE__*/ makeMap(specialBooleanAttrs)

/**
 * The full list is needed during SSR to produce the correct initial markup.
 */
export const isBooleanAttr = /*#__PURE__*/ makeMap(
  specialBooleanAttrs +
    `,async,autofocus,autoplay,controls,default,defer,disabled,hidden,` +
    `inert,loop,open,required,reversed,scoped,seamless,` +
    `checked,muted,multiple,selected`
)

/**
 * Boolean attributes should be included if the value is truthy or ''.
 * e.g. `<select multiple>` compiles to `{ multiple: '' }`
 * 这段代码定义了一个名为includeBooleanAttr的函数，用于判断一个值是否应当包含在布尔属性中。

函数接受一个参数value，表示要判断的值。

函数的逻辑如下：

首先，使用双重否定运算符!!对value进行转换。这将把value转换为布尔值，类似于使用Boolean(value)进行转换。
接着，进行条件判断，判断转换后的布尔值是否为true。
如果转换后的布尔值为true，或者value的值为空字符串''，则返回true，表示应当包含该值在布尔属性中。
如果转换后的布尔值为false，且value的值不为空字符串，则返回false，表示不应当包含该值在布尔属性中。
 */
export function includeBooleanAttr(value: unknown): boolean {
  return !!value || value === ''
}

const unsafeAttrCharRE = /[>/="'\u0009\u000a\u000c\u0020]/
const attrValidationCache: Record<string, boolean> = {}
/**
 * 
 * 这段代码定义了一个名为isSSRSafeAttrName的函数，用于判断给定的属性名是否是安全的用于服务器端渲染 (SSR) 的。

函数接受一个参数name，表示要判断的属性名。

函数的逻辑如下：

首先，通过attrValidationCache.hasOwnProperty(name)判断给定的属性名是否已经存在于attrValidationCache对象中。attrValidationCache是一个缓存对象，用于存储属性名的验证结果。
如果属性名已经存在于缓存中，则直接返回缓存中对应的验证结果，避免重复的验证过程。
如果属性名不在缓存中，继续执行后续的验证逻辑。
使用正则表达式unsafeAttrCharRE.test(name)对属性名进行验证，判断是否包含不安全的字符。
如果属性名包含不安全的字符，则在控制台输出错误信息，指示属性名不安全。
将属性名的验证结果存储到attrValidationCache对象中，以便下次验证时可以直接使用缓存结果。
返回属性名是否安全的布尔值，通过取非操作符!来得到结果。如果属性名不包含不安全字符，则返回true，否则返回false。
 */
export function isSSRSafeAttrName(name: string): boolean {
  if (attrValidationCache.hasOwnProperty(name)) {
    return attrValidationCache[name]
  }
  const isUnsafe = unsafeAttrCharRE.test(name)
  if (isUnsafe) {
    console.error(`unsafe attribute name: ${name}`)
  }
  return (attrValidationCache[name] = !isUnsafe)
}

export const propsToAttrMap: Record<string, string | undefined> = {
  acceptCharset: 'accept-charset',
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv'
}

/**
 * Known attributes, this is used for stringification of runtime static nodes
 * so that we don't stringify bindings that cannot be set from HTML.
 * Don't also forget to allow `data-*` and `aria-*`!
 * Generated from https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
 */
export const isKnownHtmlAttr = /*#__PURE__*/ makeMap(
  `accept,accept-charset,accesskey,action,align,allow,alt,async,` +
    `autocapitalize,autocomplete,autofocus,autoplay,background,bgcolor,` +
    `border,buffered,capture,challenge,charset,checked,cite,class,code,` +
    `codebase,color,cols,colspan,content,contenteditable,contextmenu,controls,` +
    `coords,crossorigin,csp,data,datetime,decoding,default,defer,dir,dirname,` +
    `disabled,download,draggable,dropzone,enctype,enterkeyhint,for,form,` +
    `formaction,formenctype,formmethod,formnovalidate,formtarget,headers,` +
    `height,hidden,high,href,hreflang,http-equiv,icon,id,importance,inert,integrity,` +
    `ismap,itemprop,keytype,kind,label,lang,language,loading,list,loop,low,` +
    `manifest,max,maxlength,minlength,media,min,multiple,muted,name,novalidate,` +
    `open,optimum,pattern,ping,placeholder,poster,preload,radiogroup,readonly,` +
    `referrerpolicy,rel,required,reversed,rows,rowspan,sandbox,scope,scoped,` +
    `selected,shape,size,sizes,slot,span,spellcheck,src,srcdoc,srclang,srcset,` +
    `start,step,style,summary,tabindex,target,title,translate,type,usemap,` +
    `value,width,wrap`
)

/**
 * Generated from https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
 */
export const isKnownSvgAttr = /*#__PURE__*/ makeMap(
  `xmlns,accent-height,accumulate,additive,alignment-baseline,alphabetic,amplitude,` +
    `arabic-form,ascent,attributeName,attributeType,azimuth,baseFrequency,` +
    `baseline-shift,baseProfile,bbox,begin,bias,by,calcMode,cap-height,class,` +
    `clip,clipPathUnits,clip-path,clip-rule,color,color-interpolation,` +
    `color-interpolation-filters,color-profile,color-rendering,` +
    `contentScriptType,contentStyleType,crossorigin,cursor,cx,cy,d,decelerate,` +
    `descent,diffuseConstant,direction,display,divisor,dominant-baseline,dur,dx,` +
    `dy,edgeMode,elevation,enable-background,end,exponent,fill,fill-opacity,` +
    `fill-rule,filter,filterRes,filterUnits,flood-color,flood-opacity,` +
    `font-family,font-size,font-size-adjust,font-stretch,font-style,` +
    `font-variant,font-weight,format,from,fr,fx,fy,g1,g2,glyph-name,` +
    `glyph-orientation-horizontal,glyph-orientation-vertical,glyphRef,` +
    `gradientTransform,gradientUnits,hanging,height,href,hreflang,horiz-adv-x,` +
    `horiz-origin-x,id,ideographic,image-rendering,in,in2,intercept,k,k1,k2,k3,` +
    `k4,kernelMatrix,kernelUnitLength,kerning,keyPoints,keySplines,keyTimes,` +
    `lang,lengthAdjust,letter-spacing,lighting-color,limitingConeAngle,local,` +
    `marker-end,marker-mid,marker-start,markerHeight,markerUnits,markerWidth,` +
    `mask,maskContentUnits,maskUnits,mathematical,max,media,method,min,mode,` +
    `name,numOctaves,offset,opacity,operator,order,orient,orientation,origin,` +
    `overflow,overline-position,overline-thickness,panose-1,paint-order,path,` +
    `pathLength,patternContentUnits,patternTransform,patternUnits,ping,` +
    `pointer-events,points,pointsAtX,pointsAtY,pointsAtZ,preserveAlpha,` +
    `preserveAspectRatio,primitiveUnits,r,radius,referrerPolicy,refX,refY,rel,` +
    `rendering-intent,repeatCount,repeatDur,requiredExtensions,requiredFeatures,` +
    `restart,result,rotate,rx,ry,scale,seed,shape-rendering,slope,spacing,` +
    `specularConstant,specularExponent,speed,spreadMethod,startOffset,` +
    `stdDeviation,stemh,stemv,stitchTiles,stop-color,stop-opacity,` +
    `strikethrough-position,strikethrough-thickness,string,stroke,` +
    `stroke-dasharray,stroke-dashoffset,stroke-linecap,stroke-linejoin,` +
    `stroke-miterlimit,stroke-opacity,stroke-width,style,surfaceScale,` +
    `systemLanguage,tabindex,tableValues,target,targetX,targetY,text-anchor,` +
    `text-decoration,text-rendering,textLength,to,transform,transform-origin,` +
    `type,u1,u2,underline-position,underline-thickness,unicode,unicode-bidi,` +
    `unicode-range,units-per-em,v-alphabetic,v-hanging,v-ideographic,` +
    `v-mathematical,values,vector-effect,version,vert-adv-y,vert-origin-x,` +
    `vert-origin-y,viewBox,viewTarget,visibility,width,widths,word-spacing,` +
    `writing-mode,x,x-height,x1,x2,xChannelSelector,xlink:actuate,xlink:arcrole,` +
    `xlink:href,xlink:role,xlink:show,xlink:title,xlink:type,xml:base,xml:lang,` +
    `xml:space,y,y1,y2,yChannelSelector,z,zoomAndPan`
)
