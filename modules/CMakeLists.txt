cmake_minimum_required(VERSION 3.16.0)

# Prevent installation of SQLite built components. (we use the .a library files directly)
option(SQLITECPP_INSTALL "Enables the install target." OFF)
option(BUILD_SHARED_LIBS "Build shared libraries (DLLs)." OFF)

add_subdirectory("SQLiteCpp")


set(SDBUSCPP_BUILD_CODEGEN off)
set(SDBUSCPP_INSTALL off)
set(SDBUSCPP_BUILD_DOCS off)
set(SDBUSCPP_BUILD_DOXYGEN_DOCS off)
set(SDBUSCPP_BUILD_TESTS off)
add_subdirectory("sdbus-cpp")


option(PIPEDAL_USE_SYSTEM_LIBZIP "Use system-installed libzip instead of the bundled submodule (required on distros that only ship a shared zstd)" OFF)

if(PIPEDAL_USE_SYSTEM_LIBZIP)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(libzip REQUIRED IMPORTED_TARGET libzip)
    # The rest of the build links against the bare 'zip' target; wrap via INTERFACE.
    add_library(zip INTERFACE)
    target_link_libraries(zip INTERFACE PkgConfig::libzip)
else()
    option(ENABLE_COMMONCRYPTO "Enable use of CommonCrypto" OFF)
    option(ENABLE_GNUTLS "Enable use of GnuTLS" OFF)
    option(ENABLE_MBEDTLS "Enable use of mbed TLS" OFF)
    option(ENABLE_OPENSSL "Enable use of OpenSSL" OFF)
    option(ENABLE_WINDOWS_CRYPTO "Enable use of Windows cryptography libraries" OFF)

    option(BUILD_TOOLS "Build tools in the src directory (zipcmp, zipmerge, ziptool)" OFF)
    option(BUILD_REGRESS "Build regression tests" OFF)
    option(BUILD_OSSFUZZ "Build fuzzers for ossfuzz" OFF)
    option(BUILD_EXAMPLES "Build examples" OFF)
    option(BUILD_DOC "Build documentation" OFF)

    option(LIBZIP_DO_INSTALL "Install libzip and the related files" OFF)
    option(BUILD_SHARED_LIBS "Build shared libraries (DLLs)." OFF)
    add_subdirectory("libzip")
endif()

