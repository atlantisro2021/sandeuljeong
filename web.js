const express = require('express')
const cookieParser = require('cookie-parser');
const app = express()
// const port = 8001
const cheerio = require('cheerio');
const mysql = require('mysql2')
const util = require('util'); //2개의 db를 하나의 페이지에 연동시키기 위해 필요함
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const html = require('html');
const http = require('http'); // 이 부분 추가
const https = require('https');
var bodyParser = require('body-parser')
var session = require('express-session')
const fileUploader = require('./public/js/fileUploader.js')
require('dotenv').config()

const connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '1658',
    database : 'test'
});

const sslOptions = {
    key: fs.readFileSync(__dirname + "/public/ssl/private.pem"),
    cert: fs.readFileSync(__dirname + "/public/ssl/public.pem"),
    passphrase: "nice2021!"
};

const queryAsync = util.promisify(connection.query).bind(connection); //2개의 db를 하나의 페이지에 연동시키기 위해 필요함

app.set('view engine', 'ejs')
app.set('views', __dirname + '/views' )

app.use(bodyParser.json()); // 여기에 추가
app.use(bodyParser.urlencoded({ extended: true })); // 여기에 추가
app.use(cookieParser());
app.use('/public', express.static(__dirname + '/public')); //css, img등을 특정 경로 외부에서 끌어오기 위해 있어야 함.
app.use(session({ secret: 'atlantisro', cookie: { maxAge: 60 * 60 * 1000 }, rolling: true, resave: true, saveUninitialized: true}))
app.use((req, res, next) => {
    res.locals.user_id = "";
    res.locals.name = "";
    if(req.session.member){
        res.locals.user_id = req.session.member.user_id
        res.locals.name = req.session.member.name
    }
    next()
})

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/public/documents/popup/');
    },
    filename: function (req, file, cb) {
        // 랜덤한 문자열 생성
        let randomName = crypto.randomBytes(16).toString('hex');
        let ext = path.extname(file.originalname); // 파일의 확장자
        cb(null, randomName + ext);
    }
});

const upload = multer({ storage: storage });

// 이미지 업로드 및 DB 저장 라우터
app.get('/popupManage', (req, res) => {
    let currentPage = req.query.page || 1; // 현재 페이지 번호
    let itemsPerPage = 10; // 페이지당 아이템 수
    let offset = (currentPage - 1) * itemsPerPage; // offset 계산

    var sql = `SELECT * FROM popup ORDER BY idx DESC LIMIT ${offset}, ${itemsPerPage}`; // SQL 쿼리
    var countSql = `SELECT COUNT(*) as totalCount FROM popup`; // 전체 데이터의 개수를 가져오는 SQL 쿼리

    connection.query(sql, function (err, result, fields) {
        if (err) throw err;

        connection.query(countSql, function (countErr, countResult, countFields) {
            if (countErr) throw countErr;

            let totalCount = countResult[0].totalCount;
            let totalPages = Math.ceil(totalCount / itemsPerPage);  // 전체 페이지 수 계산

            res.render('./manage/popupManage/popup', {
                popupData: result[0], // 첫 번째 데이터만 전달
                totalCount: totalCount,
                itemsPerPage: itemsPerPage,
                currentPage: currentPage,
                totalPages: totalPages
            });
        });
    });
});
function deleteUnusedImagesFromDB() {
    // DB에서 이미지 경로 가져오기
    connection.query('SELECT img FROM popup', (error, results) => {
        if (error) {
            console.error("Error fetching from DB:", error);
            return;
        }

        // DB에 저장된 이미지의 파일 이름
        const savedImageFilename = path.basename(results[0].img);

        // 해당 이미지를 제외하고 나머지 이미지 삭제
        const directoryPath = path.join(__dirname, '/public/documents/popup/');
        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                console.error("Error reading directory:", err);
                return;
            }

            for (const file of files) {
                if (file !== savedImageFilename) { // DB에 저장된 이미지 파일 이름과 다른 경우
                    const filePath = path.join(directoryPath, file);
                    fs.unlink(filePath, err => {
                        if (err) console.error("Error deleting file:", err);
                    });
                }
            }
        });
    });
}
app.post('/uploadPopup', upload.single('popupImage'), (req, res) => {

    let imagePath = req.file ? req.file.filename : null;
    const status = req.body.status === "on" ? 1 : 0;

    connection.query('SELECT * FROM popup', (error, results) => {
        if (error) {
            console.error(error);
            return res.send(`
                <script>
                    alert("이미지를 삽입하는 것에 에러가 발생했습니다");
                    window.location.href="/popupManage";
                </script>`);
        }

        if (results.length > 0) {  // 이미 데이터가 있으면
            let updateQuery = 'UPDATE popup SET status = ? WHERE idx = ?';
            let queryParams = [status, results[0].idx];

            if (imagePath) {  // 이미지가 제공된 경우
                updateQuery = 'UPDATE popup SET img = ?, status = ? WHERE idx = ?';
                queryParams = [imagePath, status, results[0].idx];
            }

            connection.query(updateQuery, queryParams, (err) => {
                if (err) {
                    console.error(err);
                    return res.send(`
                        <script>
                            alert("이미지를 삽입하는 것에 에러가 발생했습니다");
                            window.location.href="/popupManage";
                        </script>`);
                }

                deleteUnusedImagesFromDB();

                res.send(`
                    <script>
                        alert("성공적으로 저장되었습니다");
                        window.location.href="/popupManage";
                    </script>`);
            });

        } else {  // 데이터가 없으면
            if (!imagePath) {  // 이미지가 제공되지 않은 경우
                return res.send(`
                    <script>
                        alert("사진을 첨부해주세요");
                        window.location.href="/popupManage";
                    </script>`);
            }

            connection.query('INSERT INTO popup (img, status) VALUES (?, ?)', [imagePath, status], (err) => {
                if (err) {
                    console.error(err);
                    return res.send(`
                        <script>
                            alert("이미지를 삽입하는 것에 에러가 발생했습니다");
                            window.location.href="/popupManage";
                        </script>`);
                }

                deleteUnusedImagesFromDB();

                res.send(`
                    <script>
                        alert("성공적으로 저장되었습니다");
                        window.location.href="/popupManage";
                    </script>`);
            });
        }
    });
});
// 파트너 관리
app.get('/m-partner', (req, res) => {
    let currentPage = req.query.page || 1; // 현재 페이지 번호
    let itemsPerPage = 10; // 페이지당 아이템 수
    let offset = (currentPage - 1) * itemsPerPage; // offset 계산

    var sql = `SELECT * FROM qa ORDER BY idx DESC LIMIT ${offset}, ${itemsPerPage}`; // SQL 쿼리
    var countSql = `SELECT COUNT(*) as totalCount FROM notice`; // 전체 데이터의 개수를 가져오는 SQL 쿼리

    connection.query(sql, function (err, result, fields) {
        if (err) throw err;

        connection.query(countSql, function (countErr, countResult, countFields) {
            if (countErr) throw countErr;

            let totalCount = countResult[0].totalCount;
            let totalPages = Math.ceil(totalCount / itemsPerPage);  // 전체 페이지 수 계산

            res.render('./manage/partner/partner', {
                lists: result,
                totalCount: totalCount,
                itemsPerPage: itemsPerPage,
                currentPage: currentPage,
                totalPages: totalPages  // 전체 페이지 수를 EJS로 전달
            });
        });
    });
});
// 파트너 관리

//공지사항 Notice
app.get('/m-notice', (req, res) => {
    let currentPage = req.query.page || 1; // 현재 페이지 번호
    let itemsPerPage = 10; // 페이지당 아이템 수
    let offset = (currentPage - 1) * itemsPerPage; // offset 계산

    var sql = `SELECT * FROM notice ORDER BY idx DESC LIMIT ${offset}, ${itemsPerPage}`; // SQL 쿼리
    var countSql = `SELECT COUNT(*) as totalCount FROM notice`; // 전체 데이터의 개수를 가져오는 SQL 쿼리

    connection.query(sql, function (err, result, fields) {
        if (err) throw err;

        connection.query(countSql, function (countErr, countResult, countFields) {
            if (countErr) throw countErr;

            let totalCount = countResult[0].totalCount;
            let totalPages = Math.ceil(totalCount / itemsPerPage);  // 전체 페이지 수 계산

            res.render('./manage/notice/notice', {
                lists: result,
                totalCount: totalCount,
                itemsPerPage: itemsPerPage,
                currentPage: currentPage,
                totalPages: totalPages  // 전체 페이지 수를 EJS로 전달
            });
        });
    });
});


app.post('/deleteNotices', (req, res) => {
    console.log(req.body.ids);
    let ids = req.body.ids;
    if (!ids || ids.length === 0) return res.json({ message: '삭제할 항목이 없습니다.' });

    let placeholders = ids.map(() => '?').join(','); // Prepare placeholders for SQL query
    let sql = `DELETE FROM notice WHERE idx IN (${placeholders})`;

    connection.query(sql, ids, (err, results) => {
        if (err) throw err;
        res.json({ message: '선택한 항목이 삭제되었습니다.' });
    });
});
app.get('/noticedel', (req, res) => {
    var idx = req.query.idx
    var sql = `delete from notice where idx='${idx}'`
    connection.query(sql, function (err, result){
        if(err) throw err;
        res.send("<script> alert ('삭제되었습니다.'); location.href='/m-notice'; </script>");
    })
})
app.post('/writeNotice', (req, res) => {
    const title = req.body.title;
    const memo = req.body.memo;

    const $ = cheerio.load(memo);  // HTML 파싱
    let thumbnail = $('img').first().attr('src');  // 첫 번째 이미지의 src 찾기

    // thumbnail이 없으면 빈 문자열로 설정
    if (!thumbnail) {
        res.send("<script> alert('최소 1개의 이미지를 등록해주세요'); location.href='/writeNoticepage'; </script>")
        return;
    }

    var sql = 'INSERT INTO notice(title, memo, thumbnail, regdate) VALUES (?, ?, ?, NOW())';
    connection.query(sql, [title, memo, thumbnail], function(err, result) {  // thumbnail 변수 사용
        if (err) throw err;
        res.send("<script> alert('게시글이 등록되었습니다'); location.href='/m-notice'; </script>");
    });
})
app.get('/writeNoticepage', (req, res) => {
    res.render('./manage/notice/writeNoticepage')
})
app.get('/noticedetail', (req, res) => {
    const idx = req.query.idx;

    const sqlCurrent = `SELECT * FROM notice WHERE idx = ${mysql.escape(idx)}`;
    const sqlPrev = `SELECT idx FROM notice WHERE idx < ${mysql.escape(idx)} ORDER BY idx DESC LIMIT 1`;
    const sqlNext = `SELECT idx FROM notice WHERE idx > ${mysql.escape(idx)} ORDER BY idx ASC LIMIT 1`;

    connection.query(sqlCurrent, (err, resultCurrent) => {
        if (err) throw err;

        connection.query(sqlPrev, (err, resultPrev) => {
            if (err) throw err;

            connection.query(sqlNext, (err, resultNext) => {
                if (err) throw err;

                // result를 상세 페이지 템플릿으로 전달
                res.render('./manage/notice/notice-detail', {
                    item: resultCurrent[0],
                    prev: resultPrev[0] ? resultPrev[0].idx : null,
                    next: resultNext[0] ? resultNext[0].idx : null
                });
            });
        });
    });
});
app.get('/editnoticepage', (req, res) => {
    const idx = req.query.idx;
    const sql = `SELECT * FROM notice WHERE idx = ${mysql.escape(idx)}`;
    connection.query(sql, (err, result) => {
        if (err) throw err;
        res.render('./manage/notice/editnoticepage', { item: result[0] });
    });
});
app.post('/editnotice', (req, res) => {
    const idx = req.body.idx;
    const title = req.body.title;
    const memo = req.body.memo;

    // HTML 파싱
    const $ = cheerio.load(memo);
    let thumbnail = $('img').first().attr('src');  // 첫 번째 이미지의 src 찾기

    // thumbnail이 없으면 빈 문자열로 설정
    if (!thumbnail) {
        thumbnail = '';  // 이 부분은 필요에 따라 조정하실 수 있습니다.
    }

    // thumbnail 업데이트 부분 추가
    const sql = `UPDATE notice SET title = ?, memo = ?, thumbnail = ? WHERE idx = ?`;
    connection.query(sql, [title, memo, thumbnail, idx], (err, result) => {
        if (err) throw err;
        res.send("<script> alert('수정되었습니다.'); location.href='/m-notice'; </script>");
    });
});
//공지사항 Notice

//공지사항 news
app.get('/newsdel', (req, res) => {
    var idx = req.query.idx
    var sql = `delete from news where idx='${idx}'`
    connection.query(sql, function (err, result){
        if(err) throw err;
        res.send("<script> alert ('삭제되었습니다.'); location.href='/m_news'; </script>");
    })
})
app.get('/m_news', (req, res) => {
    let currentPage = req.query.page || 1; // 현재 페이지 번호
    let itemsPerPage = 10; // 페이지당 아이템 수
    let offset = (currentPage - 1) * itemsPerPage; // offset 계산

    var sql = `SELECT * FROM news ORDER BY idx DESC LIMIT ${offset}, ${itemsPerPage}`; // SQL 쿼리
    var countSql = `SELECT COUNT(*) as totalCount FROM news`; // 전체 데이터의 개수를 가져오는 SQL 쿼리

    connection.query(sql, function (err, result, fields) {
        if (err) throw err;

        connection.query(countSql, function (countErr, countResult, countFields) {
            if (countErr) throw countErr;

            let totalCount = countResult[0].totalCount;
            let totalPages = Math.ceil(totalCount / itemsPerPage);  // 전체 페이지 수 계산

            res.render('./manage/news/news', {
                lists: result,
                totalCount: totalCount,
                itemsPerPage: itemsPerPage,
                currentPage: currentPage,
                totalPages: totalPages  // 전체 페이지 수를 EJS로 전달
            });
        });
    });
});
app.post('/deleteNews', (req, res) => {
    let ids = req.body.ids;
    if (!ids || ids.length === 0) return res.json({ message: '삭제할 항목이 없습니다.' });

    let placeholders = ids.map(() => '?').join(',');
    let sql = `DELETE FROM news WHERE idx IN (${placeholders})`;

    connection.query(sql, ids, (err, results) => {
        if (err) throw err;
        res.json({ message: '선택한 항목이 삭제되었습니다.' });
    });
});

app.get('/writeNewspage', (req, res) => {
    res.render('./manage/news/writeNewspage')
})
app.post('/writeNews', (req, res) => {
    const title = req.body.title;
    const memo = req.body.memo;

    const $ = cheerio.load(memo);  // HTML 파싱
    let thumbnail = $('img').first().attr('src');  // 첫 번째 이미지의 src 찾기

    // thumbnail이 없으면 빈 문자열로 설정
    if (!thumbnail) {
        res.send("<script> alert('최소 1개의 이미지를 등록해주세요'); location.href='/writenewspage'; </script>")
        return;
    }

    var sql = 'INSERT INTO news(title, memo, thumbnail, regdate) VALUES (?, ?, ?, NOW())';
    connection.query(sql, [title, memo, thumbnail], function(err, result) {  // thumbnail 변수 사용
        if (err) throw err;
        res.send("<script> alert('게시글이 등록되었습니다'); location.href='/m_news'; </script>");
    });
})
app.get('/newsdetail', (req, res) => {
    const idx = req.query.idx;

    const sqlCurrent = `SELECT * FROM news WHERE idx = ${mysql.escape(idx)}`;
    const sqlPrev = `SELECT idx FROM news WHERE idx < ${mysql.escape(idx)} ORDER BY idx DESC LIMIT 1`;
    const sqlNext = `SELECT idx FROM news WHERE idx > ${mysql.escape(idx)} ORDER BY idx ASC LIMIT 1`;

    connection.query(sqlCurrent, (err, resultCurrent) => {
        if (err) throw err;

        connection.query(sqlPrev, (err, resultPrev) => {
            if (err) throw err;

            connection.query(sqlNext, (err, resultNext) => {
                if (err) throw err;

                // result를 상세 페이지 템플릿으로 전달
                res.render('./manage/news/news-detail', {
                    item: resultCurrent[0],
                    prev: resultPrev[0] ? resultPrev[0].idx : null,
                    next: resultNext[0] ? resultNext[0].idx : null
                });
            });
        });
    });
});
app.get('/editnewspage', (req, res) => {
    const idx = req.query.idx;
    const sql = `SELECT * FROM news WHERE idx = ${mysql.escape(idx)}`;
    connection.query(sql, (err, result) => {
        if (err) throw err;
        res.render('./manage/news/editnewspage', { item: result[0] });
    });
});

app.post('/editnews', (req, res) => {
    const idx = req.body.idx;
    const title = req.body.title;
    const memo = req.body.memo;

    // HTML 파싱
    const $ = cheerio.load(memo);
    let thumbnail = $('img').first().attr('src');  // 첫 번째 이미지의 src 찾기

    // thumbnail이 없으면 빈 문자열로 설정
    if (!thumbnail) {
        thumbnail = '';  // 이 부분은 필요에 따라 조정하실 수 있습니다.
    }

    // thumbnail 업데이트 부분 추가
    const sql = `UPDATE news SET title = ?, memo = ?, thumbnail = ? WHERE idx = ?`;
    connection.query(sql, [title, memo, thumbnail, idx], (err, result) => {
        if (err) throw err;
        res.send("<script> alert('수정되었습니다.'); location.href='/m_news'; </script>");
    });
});
//공지사항 news

//공지사항 > review
app.get('/reviewdel', (req, res) => {
    var idx = req.query.idx
    var sql = `delete from review where idx='${idx}'`
    connection.query(sql, function (err, result){
        if(err) throw err;
        res.send("<script> alert ('삭제되었습니다.'); location.href='/m-review'; </script>");
    })
})
app.get('/m-review', (req, res) => {
    let currentPage = req.query.page || 1; // 현재 페이지 번호
    let itemsPerPage = 10; // 페이지당 아이템 수
    let offset = (currentPage - 1) * itemsPerPage; // offset 계산

    var sql = `SELECT * FROM review ORDER BY idx DESC LIMIT ${offset}, ${itemsPerPage}`; // SQL 쿼리
    var countSql = `SELECT COUNT(*) as totalCount FROM review`; // 전체 데이터의 개수를 가져오는 SQL 쿼리

    connection.query(sql, function (err, result, fields) {
        if (err) throw err;

        connection.query(countSql, function (countErr, countResult, countFields) {
            if (countErr) throw countErr;

            let totalCount = countResult[0].totalCount;
            let totalPages = Math.ceil(totalCount / itemsPerPage);  // 전체 페이지 수 계산

            res.render('./manage/review/review', {
                lists: result,
                totalCount: totalCount,
                itemsPerPage: itemsPerPage,
                currentPage: currentPage,
                totalPages: totalPages  // 전체 페이지 수를 EJS로 전달
            });
        });
    });
});
app.post('/deleteReviews', (req, res) => {
    let ids = req.body.ids;
    if (!ids || ids.length === 0) return res.json({ message: '삭제할 항목이 없습니다.' });

    let placeholders = ids.map(() => '?').join(',');
    let sql = `DELETE FROM review WHERE idx IN (${placeholders})`;

    connection.query(sql, ids, (err, results) => {
        if (err) throw err;
        res.json({ message: '선택한 항목이 삭제되었습니다.' });
    });
});

app.get('/writeReviewpage', (req, res) => {
    res.render('./manage/review/writeReviewpage')
})
app.post('/writeReview', (req, res) => {
    const title = req.body.title;
    const memo = req.body.memo;

    const $ = cheerio.load(memo);  // HTML 파싱
    let thumbnail = $('img').first().attr('src');  // 첫 번째 이미지의 src 찾기

    // thumbnail이 없으면 빈 문자열로 설정
    if (!thumbnail) {
        res.send("<script> alert('최소 1개의 이미지를 등록해주세요'); location.href='/writeReviewpage'; </script>")
        return;
    }

    var sql = 'INSERT INTO review(title, memo, thumbnail, regdate) VALUES (?, ?, ?, NOW())';
    connection.query(sql, [title, memo, thumbnail], function(err, result) {  // thumbnail 변수 사용
        if (err) throw err;
        res.send("<script> alert('게시글이 등록되었습니다'); location.href='/m-review'; </script>");
    });
});
app.get('/reviewdetail', (req, res) => {
    const idx = req.query.idx;

    const sqlCurrent = `SELECT * FROM review WHERE idx = ${mysql.escape(idx)}`;
    const sqlPrev = `SELECT idx FROM review WHERE idx < ${mysql.escape(idx)} ORDER BY idx DESC LIMIT 1`;
    const sqlNext = `SELECT idx FROM review WHERE idx > ${mysql.escape(idx)} ORDER BY idx ASC LIMIT 1`;

    connection.query(sqlCurrent, (err, resultCurrent) => {
        if (err) throw err;

        connection.query(sqlPrev, (err, resultPrev) => {
            if (err) throw err;

            connection.query(sqlNext, (err, resultNext) => {
                if (err) throw err;

                // result를 상세 페이지 템플릿으로 전달
                res.render('./manage/review/review-detail', {
                    item: resultCurrent[0],
                    prev: resultPrev[0] ? resultPrev[0].idx : null,
                    next: resultNext[0] ? resultNext[0].idx : null
                });
            });
        });
    });
});
app.get('/editReviewpage', (req, res) => {
    const idx = req.query.idx;
    const sql = `SELECT * FROM review WHERE idx = ${mysql.escape(idx)}`;
    connection.query(sql, (err, result) => {
        if (err) throw err;
        res.render('./manage/review/editReviewpage', { item: result[0] });
    });
});
app.post('/editReview', (req, res) => {
    const idx = req.body.idx;
    const title = req.body.title;
    const memo = req.body.memo;

    // HTML 파싱
    const $ = cheerio.load(memo);
    let thumbnail = $('img').first().attr('src');  // 첫 번째 이미지의 src 찾기

    // thumbnail이 없으면 빈 문자열로 설정
    if (!thumbnail) {
        thumbnail = '';  // 이 부분은 필요에 따라 조정하실 수 있습니다.
    }

    // thumbnail 업데이트 부분 추가
    const sql = `UPDATE review SET title = ?, memo = ?, thumbnail = ? WHERE idx = ?`;
    connection.query(sql, [title, memo, thumbnail, idx], (err, result) => {
        if (err) throw err;
        res.send("<script> alert('수정되었습니다.'); location.href='/m-review'; </script>");
    });
});
//공지사항 > review
//로그인 login
app.get('/master', (reg,res) => {
    res.render('./manage/login')
})
app.post('/loginProc', (req, res) => {
    const user_id = req.body.user_id;
    const pw = req.body.pw;

    var sql = 'SELECT * FROM member WHERE user_id=? AND pw=?';
    var values = [user_id, pw];

    connection.query(sql, values, function (err, result) {
        if (err) throw err;

        if(result.length===0){
            res.send("<script> alert ('존재하지 않는 계정입니다.'); location.href='/master'; </script>")
        } else {
            console.log(result[0]);

            req.session.member = result[0]

            res.send("<script> alert ('로그인 되었습니다.'); location.href='/m-notice'; </script>")
        }
    });
});
app.get('/logout', (req, res) => {
    req.session.member = null;
    res.send("<script> alert ('로그아웃 되었습니다'); location.href='/master'; </script>");
})
//로그인 login

//관리자 설정
app.get('/Admindel', (req, res) => {
    var idx = req.query.idx
    var sql = `delete from member where idx='${idx}'`
    connection.query(sql, function (err, result){
        if(err) throw err;
        res.send("<script> alert ('삭제되었습니다.'); location.href='/admin_manage'; </script>");
    })
})
app.post('/deleteMembers', (req, res) => {
    let ids = req.body.ids;
    if (!ids || ids.length === 0) return res.json({ message: '삭제할 항목이 없습니다.' });

    let placeholders = ids.map(() => '?').join(',');
    let sql = `DELETE FROM member WHERE idx IN (${placeholders})`;

    connection.query(sql, ids, (err, results) => {
        if (err) throw err;
        res.json({ message: '선택한 항목이 삭제되었습니다.' });
    });
});
app.get('/admin_manage', (req, res) => {
    let currentPage = req.query.page || 1; // 현재 페이지 번호
    let itemsPerPage = 10; // 페이지당 아이템 수
    let offset = (currentPage - 1) * itemsPerPage; // offset 계산

    var sql = `SELECT * FROM member ORDER BY idx DESC LIMIT ${offset}, ${itemsPerPage}`; // SQL 쿼리
    var countSql = `SELECT COUNT(*) as totalCount FROM member`; // 전체 데이터의 개수를 가져오는 SQL 쿼리

    connection.query(sql, function (err, result, fields) {
        if (err) throw err;

        connection.query(countSql, function (countErr, countResult, countFields) {
            if (countErr) throw countErr;

            let totalCount = countResult[0].totalCount;
            let totalPages = Math.ceil(totalCount / itemsPerPage);  // 전체 페이지 수 계산

            res.render('./manage/adminManage/admin_manage', {
                lists: result,
                totalCount: totalCount,
                itemsPerPage: itemsPerPage,
                currentPage: currentPage,
                totalPages: totalPages  // 전체 페이지 수를 EJS로 전달
            });
        });
    });
});

app.get('/passwordChangePage', (req, res) => {
    const userId = req.query.userId;
    res.render('./manage/adminManage/passwordChangePage', { userId: userId });
});

app.post('/updatePassword', (req, res) => {
    const userId = req.body.userId;
    const newPassword = req.body.newPassword;

    var updateSql = `UPDATE member SET pw = ? WHERE user_id = ?`;
    connection.query(updateSql, [newPassword, userId], function(err, result) {
        if (err) throw err;
        res.redirect('/admin_manage');  // 업데이트 후 관리 페이지로 리다이렉트
    });
});


app.post('/register', (req, res) => {
    const { userId, password, timestamp } = req.body;

    // SQL Injection 방지를 위해 Parameterized Query 사용
    const sql = `INSERT INTO member (user_id, pw, name) VALUES (?, ?, ?)`;

    connection.query(sql, [userId, password, timestamp], function (err, results) {
        if (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
            return;
        }
        res.json({ success: true });
    });
});

app.get('/admin_edit', (req, res) => {
    var sql = `select * from member order by idx desc`
    connection.query(sql, function (err,result,fields){
        if(err) throw err;
        res.render('./manage/adminManage/admin_edit',{lists:result})
    })
})
app.post('/checkId', (req, res) => {
    console.log(req.body); // 클라이언트에서 보낸 데이터 출력
    const userId = req.body.userId;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    const sql = 'SELECT * FROM member WHERE user_id = ?'; // 칼럼 이름을 user_id로 수정
    connection.query(sql, [userId], function (err, result) {
        if (err) throw err;

        if (result.length > 0) {
            res.json({ isDuplicate: true });
        } else {
            res.json({ isDuplicate: false });
        }
    });
});


//관리자 설정

// 파일 업로드
app.post("/upload", fileUploader.single("file"), async (req, res) => {
const imgfile = req.file;
res.json({"result":"OK", data: imgfile});
});
//

// Common 메인 라우팅
app.get('/brand', (req, res) => { //브랜드
    res.render('./common/brand/brand');
});

app.get('/', async (req, res) => {
    try {
        const newsQuery = 'SELECT * FROM news ORDER BY idx DESC';
        const reviewQuery = 'SELECT * FROM review ORDER BY idx DESC';
        const noticeQuery = 'SELECT * FROM notice ORDER BY idx DESC';
        const shopQuery = 'SELECT * FROM shop ORDER BY idx DESC';
        const popupQuery = 'SELECT * FROM popup LIMIT 1'; // 팝업 데이터를 가져오는 쿼리 추가

        const [newsResult, reviewResult, noticeResult, shopResult, popupResult] = await Promise.all([
            queryAsync(newsQuery),
            queryAsync(reviewQuery),
            queryAsync(noticeQuery),
            queryAsync(shopQuery),
            queryAsync(popupQuery) // 팝업 데이터를 가져오는 쿼리 실행
        ]);

        res.render('./common/main', {
            news: newsResult,
            review: reviewResult,
            notice: noticeResult,
            shop: shopResult,
            popup: popupResult[0] // 팝업 데이터를 EJS로 전달
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/main', async (req, res) => {
    try {
        const newsQuery = 'SELECT * FROM news ORDER BY idx DESC';
        const reviewQuery = 'SELECT * FROM review ORDER BY idx DESC';
        const noticeQuery = 'SELECT * FROM notice ORDER BY idx DESC';
        const popupQuery = 'SELECT * FROM popup LIMIT 1'; // 팝업 데이터를 가져오는 쿼리 추가

        const [newsResult, reviewResult, noticeResult, popupResult] = await Promise.all([
            queryAsync(newsQuery),
            queryAsync(reviewQuery),
            queryAsync(noticeQuery),
            queryAsync(popupQuery) // 팝업 데이터를 가져오는 쿼리 실행
        ]);

        res.render('./common/main', {
            news: newsResult,
            review: reviewResult,
            notice: noticeResult,
            popup: popupResult[0] // 팝업 데이터를 EJS로 전달
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/news', (req, res) => {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = 9; // 한 페이지에 표시할 항목 수
    const offset = (page - 1) * limit;

    // 전체 항목 수 조회
    connection.query('SELECT COUNT(*) AS count FROM news', (err, data) => {
        if (err) throw err;
        const totalItems = data[0].count;
        const totalPages = Math.ceil(totalItems / limit);

        // 현재 페이지 데이터 조회
        var sql = `SELECT idx, title, thumbnail FROM news ORDER BY regdate DESC LIMIT ? OFFSET ?`;
        connection.query(sql, [limit, offset], (err, result) => {
            if (err) throw err;
            res.render('./common/notice/news', {
                list: result,
                currentPage: page,
                totalPages: totalPages
            });
        });
    });
});

app.get('/notice', (req, res) => {
    let page = req.query.page || 1; // 현재 페이지 번호 (기본값 1)
    let limit = 10; // 페이지당 게시글 수
    let offset = (page - 1) * limit; // 건너뛸 게시글 수

    var sql = `SELECT * FROM notice ORDER BY idx DESC LIMIT ?, ?`;
    connection.query(sql, [offset, limit], function (err, result, fields) {
        if (err) throw err;
        // 전체 게시글 수를 가져오는 쿼리도 필요할 수 있음
        var sqlTotal = `SELECT COUNT(*) AS total FROM notice`;
        connection.query(sqlTotal, function (err, totalResult) {
            if (err) throw err;
            res.render('./common/notice/notice', {
                lists: result,
                total: totalResult[0].total,
                currentPage: page,
                limit: limit
            });
        });
    });
});

app.get('/shop', (req, res) => {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = 9; // 한 페이지에 표시할 항목 수
    const offset = (page - 1) * limit;

    // 전체 항목 수 조회
    connection.query('SELECT COUNT(*) AS count FROM shop', (err, data) => {
        if (err) throw err;
        const totalItems = data[0].count;
        const totalPages = Math.ceil(totalItems / limit);

        // 현재 페이지 데이터 조회
        var sql = `SELECT idx, title, subtitle, link, thumbnail FROM shop ORDER BY regdate DESC LIMIT ? OFFSET ?`;
        connection.query(sql, [limit, offset], (err, result) => {
            if (err) throw err;
            res.render('./common/shop/shop', {
                list: result,
                currentPage: page,
                totalPages: totalPages
            });
        });
    });
});

app.get('/dome', (req, res) => {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = 9; // 한 페이지에 표시할 항목 수
    const offset = (page - 1) * limit;

    // 전체 항목 수 조회
    connection.query('SELECT COUNT(*) AS count FROM shop', (err, data) => {
        if (err) throw err;
        const totalItems = data[0].count;
        const totalPages = Math.ceil(totalItems / limit);

        // 현재 페이지 데이터 조회
        var sql = `SELECT idx, title, subtitle, link, thumbnail FROM shop ORDER BY regdate DESC LIMIT ? OFFSET ?`;
        connection.query(sql, [limit, offset], (err, result) => {
            if (err) throw err;
            res.render('./common/partner/dome', {
                list: result,
                currentPage: page,
                totalPages: totalPages
            });
        });
    });
});

app.get('/get-review-details', (req, res) => {
    const idx = req.query.idx;
    const sql = `SELECT * FROM review WHERE idx = ?`;
    connection.query(sql, [idx], function(err, result) {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        if (!result[0]) {
            res.status(404).json({ error: 'Data not found' });
            return;
        }
        res.json(result[0]);
    });
});

// QA
app.get('/qa', (req, res) => {
        res.render('./common/qa/qa')
    }
)
app.post('/submit-qa', (req, res) => {
    const company = req.body.company;
    const name = req.body.name;
    const email = req.body.email;
    const number = req.body.number;
    const memo = req.body.memo;

    var sql = `INSERT INTO qa (company, name, email, number, memo, regdate, status) VALUES (?, ?, ?, ?, ?, NOW(), 0)`;
    connection.query(sql, [company, name, email, number, memo], function (err, result) {
        if (err) throw err;
        res.send("<script> alert('문의가 등록되었습니다. 빠른 기일내에 답변드리겠습니다.'); location.href='/'; </script>");
    });
})

app.get('/m-shop', (req, res) => {
    let currentPage = req.query.page || 1; // 현재 페이지 번호
    let itemsPerPage = 10; // 페이지당 아이템 수
    let offset = (currentPage - 1) * itemsPerPage; // offset 계산

    var sql = `SELECT * FROM shop ORDER BY idx DESC LIMIT ${offset}, ${itemsPerPage}`; // SQL 쿼리
    var countSql = `SELECT COUNT(*) as totalCount FROM shop`; // 전체 데이터의 개수를 가져오는 SQL 쿼리

    connection.query(sql, function (err, result, fields) {
        if (err) throw err;

        connection.query(countSql, function (countErr, countResult, countFields) {
            if (countErr) throw countErr;

            let totalCount = countResult[0].totalCount;
            let totalPages = Math.ceil(totalCount / itemsPerPage);  // 전체 페이지 수 계산

            res.render('./manage/shop/shop', {
                lists: result,
                totalCount: totalCount,
                itemsPerPage: itemsPerPage,
                currentPage: currentPage,
                totalPages: totalPages  // 전체 페이지 수를 EJS로 전달
            });
        });
    });
});
app.post('/deleteShop', (req, res) => {
    console.log(req.body.ids);
    let ids = req.body.ids;
    if (!ids || ids.length === 0) return res.json({ message: '삭제할 항목이 없습니다.' });

    let placeholders = ids.map(() => '?').join(','); // Prepare placeholders for SQL query
    let sql = `DELETE FROM shop WHERE idx IN (${placeholders})`;

    connection.query(sql, ids, (err, results) => {
        if (err) throw err;
        res.json({ message: '선택한 항목이 삭제되었습니다.' });
    });
});
app.get('/Shopdel', (req, res) => {
    var idx = req.query.idx
    var sql = `delete from shop where idx='${idx}'`
    connection.query(sql, function (err, result){
        if(err) throw err;
        res.send("<script> alert ('삭제되었습니다.'); location.href='/m-shop'; </script>");
    })
})
app.post('/writeShop', (req, res) => {
    const title = req.body.title;
    const subtitle = req.body.subtitle;
    const link = req.body.link;
    const memo = req.body.memo;

    const $ = cheerio.load(memo);  // HTML 파싱
    let thumbnail = $('img').first().attr('src');  // 첫 번째 이미지의 src 찾기

    // thumbnail이 없으면 빈 문자열로 설정
    if (!thumbnail) {
        res.send("<script> alert('최소 1개의 이미지를 등록해주세요'); location.href='/writeNoticepage'; </script>")
        return;
    }

    var sql = 'INSERT INTO shop(title, subtitle, link, memo, thumbnail, regdate) VALUES (?, ?, ?, ?, ?, NOW())';
    connection.query(sql, [title, subtitle, link, memo, thumbnail], function(err, result) {  // thumbnail 변수 사용
        if (err) throw err;
        res.send("<script> alert('게시글이 등록되었습니다'); location.href='/m-shop'; </script>");
    });
})
app.get('/writeShoppage', (req, res) => {
    res.render('./manage/shop/writeShoppage')
})
app.get('/Shopdetail', (req, res) => {
    const idx = req.query.idx;

    const sqlCurrent = `SELECT * FROM shop WHERE idx = ${mysql.escape(idx)}`;
    const sqlPrev = `SELECT idx FROM shop WHERE idx < ${mysql.escape(idx)} ORDER BY idx DESC LIMIT 1`;
    const sqlNext = `SELECT idx FROM shop WHERE idx > ${mysql.escape(idx)} ORDER BY idx ASC LIMIT 1`;

    connection.query(sqlCurrent, (err, resultCurrent) => {
        if (err) throw err;

        connection.query(sqlPrev, (err, resultPrev) => {
            if (err) throw err;

            connection.query(sqlNext, (err, resultNext) => {
                if (err) throw err;

                // result를 상세 페이지 템플릿으로 전달
                res.render('./manage/shop/Shop-detail', {
                    item: resultCurrent[0],
                    prev: resultPrev[0] ? resultPrev[0].idx : null,
                    next: resultNext[0] ? resultNext[0].idx : null
                });
            });
        });
    });
});
app.get('/editShoppage', (req, res) => {
    const idx = req.query.idx;
    const sql = `SELECT * FROM shop WHERE idx = ${mysql.escape(idx)}`;
    connection.query(sql, (err, result) => {
        if (err) throw err;
        res.render('./manage/shop/editShoppage', { item: result[0] });
    });
});
app.post('/editShop', (req, res) => {
    const idx = req.body.idx;
    const title = req.body.title;
    const subtitle = req.body.subtitle;
    const link = req.body.link;
    const memo = req.body.memo;

    // HTML 파싱
    const $ = cheerio.load(memo);
    let thumbnail = $('img').first().attr('src');  // 첫 번째 이미지의 src 찾기

    // thumbnail이 없으면 빈 문자열로 설정
    if (!thumbnail) {
        thumbnail = '';  // 이 부분은 필요에 따라 조정하실 수 있습니다.
    }

    // thumbnail 업데이트 부분 추가
    const sql = `UPDATE shop SET title = ?, subtitle = ?, link = ?, memo = ?, thumbnail = ? WHERE idx = ?`;
    connection.query(sql, [title, subtitle, link, memo, thumbnail, idx], (err, result) => {
        if (err) throw err;
        res.send("<script> alert('수정되었습니다.'); location.href='/m-shop'; </script>");
    });
});
// Common 메인 라우팅




app.get('/detail', (req, res) => {
    const table = req.query.table;
    const idx = req.query.idx;

    if(!table || !idx) return res.status(400).send('Bad Request');

    let boardType;
    if(table === 'review') boardType = 'RECENT REVIEW';
    else if(table === 'news') boardType = 'RECENT NEWS';
    else if(table === 'notice') boardType = 'RECENT ANNOUNCE';
    else return res.status(400).send('Invalid Table Name');
    let webBack;
    if(table === 'review') webBack = '/public/img/web/review/review_sec01.png';
    else if(table === 'news') webBack = '/public/img/web/notice/notice_sec01.png';
    else if(table === 'notice') webBack = '/public/img/web/notice/notice_sec01.png';
    else return res.status(400).send('Invalid Table Name');
    let mobileBack;
    if(table === 'review') mobileBack = '/public/img/mobile/review/mobile_review_sec01.png';
    else if(table === 'news') mobileBack = '/public/img/mobile/notice/mobile_notice_sec01.png';
    else if(table === 'notice') mobileBack = '/public/img/mobile/notice/mobile_notice_sec01.png';
    else return res.status(400).send('Invalid Table Name');

    const sql = `SELECT * FROM ?? WHERE idx = ?`;
    connection.query(sql, [table, idx], function (err, result) {
        if(err) throw err;
        if(result.length === 0) return res.status(404).send('Not Found');

        res.render('./common/detail', { data: result[0], boardType: boardType, webBack: webBack, mobileBack: mobileBack });
    });
});
https.createServer(sslOptions, app).listen(443, () => {
    console.log(`HTTPS server running on https://localhost:8001`);
});

// HTTP 서버 생성
http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80, () => {
    console.log('HTTP server listening on port 80');
});
