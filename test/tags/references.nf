// Test file for Nextflow symbol references

process EXAMPLE {
    input:
    val x
    output:
    stdout
    script:
    "echo hello"
}

workflow MAIN {
    take:
    ch

    main:
    EXAMPLE(ch)
    //    ^ reference.call

    emit:
    EXAMPLE.out
    //    ^ reference.call
}

Channel.fromPath('*.txt')
//      ^ reference.call
    .map { it -> it.toString() }
    // ^ reference.call
    //              ^ reference.call

include { PROCESS } from './modules/process.nf'
//                       ^ reference.implementation