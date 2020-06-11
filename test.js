var test = require('tape');
var EPL = require('./')


test('basic barcode should work', function (t) {
   var epl = require('./')({ device : '/dev/usb/lp1' });

   epl.start()
      .drawBarcode('123456789999', 100, 4, true)
      .end()

   var expect = 
`N
B0,0,0,1,4,4,100,B,"123456789999"
P1
`
   t.equal(epl.output, expect, 'expected output matches');
   t.end();
})

test('text should not include \n and quotes should be escaped', function (t) {
   var epl = require('./')({ device : '/dev/usb/lp1' });

   epl.start()
      .addText(
`this
is 
"some
text"
`
      )
      .end()

   var expect = 
`N
A0,0,0,5,1,1,N,"THIS IS  \\"SOME TEXT\\" "
P1
`
   t.equal(epl.output, expect, 'expected output matches');
   t.end();
})
