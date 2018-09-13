// expected hue range: [0, 360)
// expected saturation range: [0, 1]
// expected lightness range: [0, 1]
var hslToRgb = function (hue, saturation, lightness) {
  // based on algorithm from http://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB
  if (hue === undefined) {
    return [0, 0, 0]
  }

  var chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation
  var huePrime = hue / 60
  var secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1))

  huePrime = Math.floor(huePrime)
  var red
  var green
  var blue

  if (huePrime === 0) {
    red = chroma
    green = secondComponent
    blue = 0
  } else if (huePrime === 1) {
    red = secondComponent
    green = chroma
    blue = 0
  } else if (huePrime === 2) {
    red = 0
    green = chroma
    blue = secondComponent
  } else if (huePrime === 3) {
    red = 0
    green = secondComponent
    blue = chroma
  } else if (huePrime === 4) {
    red = secondComponent
    green = 0
    blue = chroma
  } else if (huePrime === 5) {
    red = chroma
    green = 0
    blue = secondComponent
  }

  var lightnessAdjustment = lightness - (chroma / 2)
  red += lightnessAdjustment
  green += lightnessAdjustment
  blue += lightnessAdjustment

  return [Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255)]
}

// Typically all dependencies should be declared at the top of the file.

// Now let's define an API for our module, we're taking hue, saturation and luminosity values and outputting a CSS compatible hex string.
// Hue is in degrees, between 0 and 359. Since degrees a cyclical in nature, we'll support numbers greater than 359 or less than 0 by "spinning" them around until they fall within the 0 to 359 range.
// Saturation and luminosity are both percentages, we'll represent these percentages with whole numbers between 0 and 100. For these numbers we'll need to enforce a maximum and a minimum, anything below 0 will become 0, anything above 100 will become 100.
// Let's write some utility functions to handle this logic:

function max (val, n) {
  return (val > n) ? n : val
}

function min (val, n) {
  return (val < n) ? n : val
}

function cycle (val) {
  // for safety:
  val = max(val, 1e7)
  val = min(val, -1e7)
  // cycle value:
  while (val < 0) { val += 360 }
  while (val > 359) { val -= 360 }
  return val
}

// Now for the main piece, the `hsl` function:

function hsl (hue, saturation, luminosity, headString) {
  // resolve degrees to 0 - 359 range
  hue = cycle(hue)

  // enforce constraints
  saturation = min(max(saturation, 100), 0)
  luminosity = min(max(luminosity, 100), 0)

  // convert to 0 to 1 range used by hsl-to-rgb-for-reals
  saturation /= 100
  luminosity /= 100

  // let hsl-to-rgb-for-reals do the hard work
  var rgb = hslToRgb(hue, saturation, luminosity)

  // convert each value in the returned RGB array
  // to a 2 character hex value, join the array into
  // a string, prefixed with a hash
  var hexcolor = rgb
    .map(function (n) {
      return (256 + n).toString(16).substr(-2)
    })
    .join('')

  return headString + hexcolor.toUpperCase()
}

// In order to make our code into a bona fide module we have to export it:

module.exports = hsl
