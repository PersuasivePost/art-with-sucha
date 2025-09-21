Get sections:
GET
http://localhost:5000/

Create Section:
POST
(auth token required)
body: raw: name, description, image
http://localhost:5000/create-section

Edit Section:
PUT
(auth token required)
body: the thing you want to edit
http://localhost:5000/:sectionName

Delete Section:
DELETE
(auth token required)
http://localhost:5000/:sectionName

Get Subsections:
GET
http://localhost:5000/:sectionName

Create SubSection:
POST
(auth)
http://localhost:5000/:sectionName

Edit SubSection:
PUT
(auth)
http://localhost:5000/:sectionName/:subsectionName

Delete SubSection:
DELETE
(auth)
http://localhost:5000/:sectionName/:subsectionName

Get Products:
GET
http://localhost:5000/:sectionName/:subsectionName

Create Product:
POST
(auth)
http://localhost:5000/:sectionName/:subsectionName/add-product

Edit Product:
PUT:
(auth)
http://localhost:5000/:sectionName/:subsectionName/:productId

Delete Product:
DELETE:
(auth)
http://localhost:5000/:sectionName/:subsectionName/:productId