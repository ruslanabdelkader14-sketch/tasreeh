// يستقبل بيانات الرحلة فقط (بدون أي بيانات مسافرين)
// الشيت: Trips_Log  |  العمود الأخير (X) = trip_id  -> بيمنع تكرار الصف عند التعديل وإعادة الحفظ

var HEADERS = [
  'timestamp','company_name','client_name','trip_type','from_location','to_location','trip_date',
  'nationality','pax_count','car_type','car_name','car_plate','car_number','chassis_number',
  'guide_name','guide_phone','driver_name','driver_phone','backup_driver_name','backup_driver_phone',
  'cost','program_details','departure_time','trip_id'
];

function doPost(e) {
  try {
    var p = e.parameter;
    if ((p.action || 'addTrip') !== 'addTrip') return out({ status: 'ignored' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Trips_Log') || ss.insertSheet('Trips_Log');
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    var row = [
      new Date(), p.company_name, p.client_name, p.trip_type, p.from_location, p.to_location, p.trip_date,
      p.nationality, p.pax_count, p.car_type, p.car_name, p.car_plate, p.car_number, p.chassis_number,
      p.guide_name, p.guide_phone, p.driver_name, p.driver_phone, p.backup_driver_name, p.backup_driver_phone,
      getCost(p.car_type), p.program_details, p.departure_time, p.trip_id
    ];

    // لو الرحلة اتحفظت قبل كده (نفس trip_id) نحدّث صفها بدل ما نضيف صف جديد
    var idCol = HEADERS.length;
    var last = sheet.getLastRow();
    var target = 0;
    if (p.trip_id && last > 1) {
      var ids = sheet.getRange(2, idCol, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(p.trip_id)) { target = i + 2; break; }
      }
    }
    if (target) sheet.getRange(target, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);

    return out({ status: 'success' });
  } catch (err) {
    return out({ status: 'error', message: String(err) });
  }
}

function getCost(t) {
  return { 'ليموزين': 250, 'ميكروباص': 450, 'كوستر': 450, 'اوتوبيس': 600 }[t] || 0;
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
