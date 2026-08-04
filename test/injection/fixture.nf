// Fixture for scripts/check_injections.sh — covers all four
// injections.scm patterns. Keep in sync with expected.txt.

process INTERP_TRIPLE {
    script:
    """
    echo hello
    ls -la ${params.dir}
    """
}

process INTERP_DOUBLE {
    script:
    "echo ${params.greeting}"
}

process PLAIN_SINGLE {
    script:
    'echo hello'
}

process PLAIN_TRIPLE {
    script:
    '''
    echo hello
    '''
}
