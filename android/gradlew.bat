@rem Gradle wrapper script for Windows
@echo off
if not "%JAVA_HOME%"=="" goto run
set JAVA_HOME=%~dp0jdk17\jdk-17.0.10+7

:run
"C:\Users\LOQ\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\gradle-8.14.3\bin\gradle.bat" %*
