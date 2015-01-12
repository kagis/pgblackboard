// Copyright 2012 The Rust Project Developers. See the COPYRIGHT
// file at the top-level directory of this distribution and at
// http://rust-lang.org/COPYRIGHT.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.



// Some unexported constants
const DIGEST_BUF_LEN: usize = 4us; // 4 32-bit words
const WORK_BUF_LEN: usize = 16us;  // 16 32-bit words
const MSG_BLOCK_LEN: usize = 64us; // 512 bit
const K_TAB: [u32; 64] =
   [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,

    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,

    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,

    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391];

/// Structure representing the state of an Md5 computation
pub struct Md5 {
    h: [u32; DIGEST_BUF_LEN],  // a, b, c, d
    msg_len: u64,
    msg_block: [u8; MSG_BLOCK_LEN],
    msg_block_idx: usize,
    work_buf: [u32; WORK_BUF_LEN],
    computed: bool,
}

fn add_input(st: &mut Md5, msg: &[u8]) {
    assert!((!st.computed));
    for &element in msg.iter() {
        st.msg_block[st.msg_block_idx] = element;
        st.msg_block_idx += 1;
        st.msg_len += 8;
        if st.msg_len == 0 {
            // FIXME: Need better failure mode (#2346)
            assert!(false);
        }
        if st.msg_block_idx == MSG_BLOCK_LEN {
            process_msg_block(st);
            st.msg_block_idx = 0;
        }
    }
}

fn process_msg_block(st: &mut Md5) {
    // rotate x left by r
    fn rot(r: isize, x: u32) -> u32 {
        let r = r as u32;
        (x << r) | (x >> (32u32 - r))
    }

    let x = &mut st.work_buf;

    // Copy msg_block to x
    let m = &st.msg_block;
    let mut x_i = 0us;
    let mut m_i = 0us;
    while x_i < 16us {
        x[x_i] = (m[m_i] as u32)
               | ((m[m_i+1us] as u32) << 8u32)
               | ((m[m_i+2us] as u32) << 16u32)
               | ((m[m_i+3us] as u32) << 24u32);
        x_i += 1us;
        m_i += 4us;
    }

    let mut a = st.h[0];
    let mut b = st.h[1];
    let mut c = st.h[2];
    let mut d = st.h[3];

    // Round 1
    // F(X,Y,Z) = XY v not(X) Z
    let mut i = 0us;
    while i < 16us {
        a = b + rot( 7, a + ((b & c) | (!b & d)) + x[i] + K_TAB[i]);
        i += 1us;
        d = a + rot(12, d + ((a & b) | (!a & c)) + x[i] + K_TAB[i]);
        i += 1us;
        c = d + rot(17, c + ((d & a) | (!d & b)) + x[i] + K_TAB[i]);
        i += 1us;
        b = c + rot(22, b + ((c & d) | (!c & a)) + x[i] + K_TAB[i]);
        i += 1us;
    }

    // Round 2
    // G(X,Y,Z) = XZ v Y not(Z)
    let mut x_i = 1us;
    let mut k_i = 16us;
    while k_i < 32us {
        a = b + rot( 5, a + ((b & d) | (c & !d)) + x[x_i] + K_TAB[k_i]);
        x_i = (x_i + 5us) & 0xFus;
        d = a + rot( 9, d + ((a & c) | (b & !c)) + x[x_i] + K_TAB[k_i+1]);
        x_i = (x_i + 5us) & 0xFus;
        c = d + rot(14, c + ((d & b) | (a & !b)) + x[x_i] + K_TAB[k_i+2]);
        x_i = (x_i + 5us) & 0xFus;
        b = c + rot(20, b + ((c & a) | (d & !a)) + x[x_i] + K_TAB[k_i+3]);
        x_i = (x_i + 5us) & 0xFus;
        k_i += 4us;
    }

    // Round 3
    // H(X,Y,Z) = X xor Y xor Z
    let mut x_i = 5us;
    while k_i < 48us {
        a = b + rot( 4, a + (b ^ c ^ d) + x[x_i] + K_TAB[k_i]);
        x_i = (x_i + 3) & 0xFus;
        d = a + rot(11, d + (a ^ b ^ c) + x[x_i] + K_TAB[k_i+1]);
        x_i = (x_i + 3) & 0xFus;
        c = d + rot(16, c + (d ^ a ^ b) + x[x_i] + K_TAB[k_i+2]);
        x_i = (x_i + 3) & 0xFus;
        b = c + rot(23, b + (c ^ d ^ a) + x[x_i] + K_TAB[k_i+3]);
        x_i = (x_i + 3) & 0xFus;
        k_i += 4us;
    }

    // Round 4
    // I(X,Y,Z) = Y xor (X v not(Z))
    let mut x_i = 0us;
    while k_i < 64us {
        a = b + rot( 6, a + (c ^ (b | !d)) + x[x_i] + K_TAB[k_i]);
        x_i = (x_i + 7) & 0xFus;
        d = a + rot(10, d + (b ^ (a | !c)) + x[x_i] + K_TAB[k_i+1]);
        x_i = (x_i + 7) & 0xFus;
        c = d + rot(15, c + (a ^ (d | !b)) + x[x_i] + K_TAB[k_i+2]);
        x_i = (x_i + 7) & 0xFus;
        b = c + rot(21, b + (d ^ (c | !a)) + x[x_i] + K_TAB[k_i+3]);
        x_i = (x_i + 7) & 0xFus;
        k_i += 4us;
    }

    // Update the buffer
    st.h[0] += a;
    st.h[1] += b;
    st.h[2] += c;
    st.h[3] += d;
}

fn mk_result(st: &mut Md5, rs: &mut [u8]) {
    if !st.computed { pad_msg(st); st.computed = true; }
    let mut i = 0us;
    let mut r_i = 0us;
    while i < 4us {
        let w = st.h[i];
        rs[r_i] = (w & 0xFFu32) as u8;
        rs[r_i+1] = ((w >> 8u32) & 0xFFu32) as u8;
        rs[r_i+2] = ((w >> 16u32) & 0xFFu32) as u8;
        rs[r_i+3] = (w >> 24u32) as u8;
        i += 1;
        r_i += 4;
    }
}

fn append_zeros(st: &mut Md5, mut i: usize, len: usize) {
    while i < len {
        st.msg_block[i] = 0u8;
        i += 1;
    }
}

fn pad_msg_block(st: &mut Md5, len: usize) {
    st.msg_block[st.msg_block_idx] = 0x80u8;   // 1 bit
    let msg_block_idx = st.msg_block_idx+1;
    append_zeros(st, msg_block_idx, len);
}

fn pad_msg(st: &mut Md5) {
    static MSG_BLOCK_PAD_LEN: usize = MSG_BLOCK_LEN - 8;

    if st.msg_block_idx >= MSG_BLOCK_PAD_LEN {
        // Process last block before appending length
        pad_msg_block(st, MSG_BLOCK_LEN);
        process_msg_block(st);
        append_zeros(st, 0, MSG_BLOCK_PAD_LEN);
    } else {
        pad_msg_block(st, MSG_BLOCK_PAD_LEN);
    }

    // Append length
    let mut i = 0us;
    let mut len = st.msg_len;
    while i < 8us {
        st.msg_block[MSG_BLOCK_PAD_LEN+i] = (len & 0xFFu64) as u8;
        len >>= 8u64;
        i += 1;
    }

    process_msg_block(st);
}

impl Md5 {
    /// Construct an `md5` object
    pub fn new() -> Md5 {
        let mut st = Md5{
            h: [0u32; DIGEST_BUF_LEN],
            msg_len: 0u64,
            msg_block: [0u8; MSG_BLOCK_LEN],
            msg_block_idx: 0,
            work_buf: [0u32; WORK_BUF_LEN],
            computed: false,
        };
        st.reset();
        return st;
    }

    pub fn reset(&mut self) {
        self.h = [0x67452301u32,
                  0xefcdab89u32,
                  0x98badcfeu32,
                  0x10325476u32];
        self.msg_len = 0;
        self.msg_block_idx = 0;
        self.computed = false;
    }
    pub fn input(&mut self, msg: &[u8]) { add_input(self, msg); }
    pub fn result(&mut self, out: &mut [u8]) { mk_result(self, out); }
    pub fn output_bits(&self) -> usize { 128 }
}

#[cfg(test)]
mod tests {
    //use extra::digest::{Digest, DigestUtil};
    use super::Md5;

    #[deriving(Clone)]
    struct Test {
        input: &'static str,
        output: &'static [u8],
        output_str: &'static str,
    }

    #[test]
    fn test() {
        let tests = &[
            Test {
                input: "",
                output: &[
                    0xd4u8, 0x1du8, 0x8cu8, 0xd9u8,
                    0x8fu8, 0x00u8, 0xb2u8, 0x04u8,
                    0xe9u8, 0x80u8, 0x09u8, 0x98u8,
                    0xecu8, 0xf8u8, 0x42u8, 0x7eu8,
                ],
                output_str: "d41d8cd98f00b204e9800998ecf8427e",
            },
            Test {
                input: "The quick brown fox jumps over the lazy dog",
                output: &[
                    0x9eu8, 0x10u8, 0x7du8, 0x9du8,
                    0x37u8, 0x2bu8, 0xb6u8, 0x82u8,
                    0x6bu8, 0xd8u8, 0x1du8, 0x35u8,
                    0x42u8, 0xa4u8, 0x19u8, 0xd6u8,
                ],
                output_str: "9e107d9d372bb6826bd81d3542a419d6",
            },
            Test {
                input: "The quick brown fox jumps over the lazy dog.",
                output: &[
                    0xe4u8, 0xd9u8, 0x09u8, 0xc2u8,
                    0x90u8, 0xd0u8, 0xfbu8, 0x1cu8,
                    0xa0u8, 0x68u8, 0xffu8, 0xadu8,
                    0xdfu8, 0x22u8, 0xcbu8, 0xd0u8,
                ],
                output_str: "e4d909c290d0fb1ca068ffaddf22cbd0",
            },

            Test {
                input: "a",
                output: &[
                    0x0cu8, 0xc1u8, 0x75u8, 0xb9u8,
                    0xc0u8, 0xf1u8, 0xb6u8, 0xa8u8,
                    0x31u8, 0xc3u8, 0x99u8, 0xe2u8,
                    0x69u8, 0x77u8, 0x26u8, 0x61u8,
                ],
                output_str: "0cc175b9c0f1b6a831c399e269772661",
            },
            Test {
                input: "abc",
                output: &[
                    0x90u8, 0x01u8, 0x50u8, 0x98u8,
                    0x3cu8, 0xd2u8, 0x4fu8, 0xb0u8,
                    0xd6u8, 0x96u8, 0x3fu8, 0x7du8,
                    0x28u8, 0xe1u8, 0x7fu8, 0x72u8,
                ],
                output_str: "900150983cd24fb0d6963f7d28e17f72",
            },
            Test {
                input: "message digest",
                output: &[
                    0xf9u8, 0x6bu8, 0x69u8, 0x7du8,
                    0x7cu8, 0xb7u8, 0x93u8, 0x8du8,
                    0x52u8, 0x5au8, 0x2fu8, 0x31u8,
                    0xaau8, 0xf1u8, 0x61u8, 0xd0u8,
                ],
                output_str: "f96b697d7cb7938d525a2f31aaf161d0",
            },
            Test {
                input: "abcdefghijklmnopqrstuvwxyz",
                output: &[
                    0xc3u8, 0xfcu8, 0xd3u8, 0xd7u8,
                    0x61u8, 0x92u8, 0xe4u8, 0x00u8,
                    0x7du8, 0xfbu8, 0x49u8, 0x6cu8,
                    0xcau8, 0x67u8, 0xe1u8, 0x3bu8,
                ],
                output_str: "c3fcd3d76192e4007dfb496cca67e13b",
            },
            Test {
                input: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
                output: &[
                    0xd1u8, 0x74u8, 0xabu8, 0x98u8,
                    0xd2u8, 0x77u8, 0xd9u8, 0xf5u8,
                    0xa5u8, 0x61u8, 0x1cu8, 0x2cu8,
                    0x9fu8, 0x41u8, 0x9du8, 0x9fu8,
                ],
                output_str: "d174ab98d277d9f5a5611c2c9f419d9f",
            },
            Test {
                input: "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
                output: &[
                    0x57u8, 0xedu8, 0xf4u8, 0xa2u8,
                    0x2bu8, 0xe3u8, 0xc9u8, 0x55u8,
                    0xacu8, 0x49u8, 0xdau8, 0x2eu8,
                    0x21u8, 0x07u8, 0xb6u8, 0x7au8,
                ],
                output_str: "57edf4a22be3c955ac49da2e2107b67a",
            },
        ];

        let mut md = &Md5::new();
        let mut out = [0u8; 16];

        // Test that it works when accepting the message all at once
        for t in tests.iter() {
            (*md).input_str(t.input);
            md.result(out);
            assert!(t.output.as_slice() == out);

            let out_str = (*md).result_str();
            assert_eq!(out_str.len(), 32);
            assert!(out_str == t.output_str);

            md.reset();
        }

        // Test that it works when accepting the message in pieces
        for t in tests.iter() {
            let len = t.input.len();
            let mut left = len;
            while left > 0us {
                let take = (left + 1us) / 2us;
                (*md).input_str(t.input.slice(len - left, take + len - left));
                left = left - take;
            }
            md.result(out);
            assert!(t.output.as_slice() == out);

            let out_str = (*md).result_str();
            assert_eq!(out_str.len(), 32);
            assert!(out_str == t.output_str);

            md.reset();
        }
    }
}