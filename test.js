var epl = require('./')({ device : '/dev/usb/lp1' });

epl.start()
   .drawBarcode('123456789999', 100, 4, true)
   .end()
   .print(console.log);
