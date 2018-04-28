var express = require('express');
var router = express.Router();
var mysql = require('../config/mysql');

router.get('/', function (req, res, next) {
  mysql.query("SELECT * FROM users", function (err, result) {
    if (err) console.error(err);
    else res.send(result);
  });
});

router.post('/course/grade', function(req, res, next){
  let body = req.body;
  let query = `UPDATE register SET grade=${body.grade} WHERE course_id=${body.course_id}\
  AND year=${body.year} AND semester=${body.semester} AND student_id=${body.student_id}
  AND section_id=${body.section_id}`;
  mysql.query(query, function(err, result){
    if(err) return res.send('FAIL');
    else return res.send('OK');
  });
});
router.get('/advisees',function(req,res){
  const mapStudentRegis = (students) => new Promise((resolve, reject) => {
    console.log(students);
		const promises = students.map((student) => {
			return new Promise((resolve, reject) => {
				let queryRegis = 'SELECT * FROM register R RIGHT JOIN courses C ON R.course_id = C.course_id WHERE student_id = ?';
				mysql.query(queryRegis, [student.student_id], (err, courses) => {
					if (err) return reject(err);
          student.courses = courses;
          resolve();
				});
			});
		});

		Promise.all(promises).then(() => {
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});
  
  if(req.session.userType === 'instructor'){
    let userID = req.session.userID;
    const query = `SELECT * FROM students WHERE advisor_id = ${userID};`;
    mysql.query(query, function (err, students) {
      if (err) console.error(err);
      else mapStudentRegis(students).then(() => {
        res.send({ students : students });
      }).catch((err) => {
        res.send({});
      });
    });
  }
  else res.send({});
});

router.get('/course/all',function(req,res){
	if(req.session.userType !== 'instructor') return res.send({});
	const instructorID = req.session.userID;
	const query = 'SELECT * FROM (teach NATURAL JOIN (sections NATURAL JOIN time_slots)) NATURAL JOIN courses WHERE instructor_id = ' + instructorID;
	
	const promise = new Promise((resolve, reject) => {
		mysql.query(query, function(err, timeSlots) {
			if (err) reject(err);
			else resolve(timeSlots);
		});
	});
	
	let courses = [];

	promise.then(timeSlots => {

		timeSlots.map(timeSlot => {

			let course = courses.find((course) => course.course_id === timeSlot.course_id);
			if(course === undefined) {
				course = {
					course_id: timeSlot.course_id,
					name: timeSlot.name,
					credit: timeSlot.credit,
					faculty_id: timeSlot.faculty_id,
					sections: [],
				};
				courses.push(course);
			}

			let section = course.sections.find(section => section.section_id === timeSlot.section_id);
			if(section === undefined) {
				section = {
					section_id: timeSlot.section_id,
					year: timeSlot.year,
					semester: timeSlot.semester,
					capacity: timeSlot.capacity,
					building_id: timeSlot.building_id,
					room_id: timeSlot.room_id,
					time_slots: []
				};
				course.sections.push(section);
			}

			section.time_slots.push({
				slot_order: timeSlot.slot_order,
				day: timeSlot.day,
				start_time: timeSlot.start_time,
				end_time: timeSlot.end_time,
			});
		});

		res.send({ courses: courses });
	}).catch(err => {
		console.log(err);
		res.send({});
	});
});

module.exports = router;
