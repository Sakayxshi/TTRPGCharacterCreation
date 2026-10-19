CREATE OR REPLACE DATABASE ttrpg_forge;
USE ttrpg_forge;


CREATE TABLE users 
(
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE, 
    password_hash VARCHAR(255) NOT NULL
  
);