// core/stings/units/cinematicZoom.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 34)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* cinematicZoom, a dolly punch-in, as a cut cover */
    /* The GLSL sibling of the PRESENTATIONS.zoom cut. A generative overlay cannot smear the pixels
       under it, so what sells "camera" rather than "scale" here are the ARTEFACTS a fast push leaves:
       radial motion streaks that die at the optical centre (where a real dolly has no travel), the
       corners compressing into a dark rim, and a bloom as the lens settles on the new frame.
       NOTE: no backticks in here - the whole shader is a JS template literal and one would end it. */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float r = length(d);
    float ang = atan(d.y, d.x);
    float ease = pp*pp*(3.0 - 2.0*pp);                 /* accelerate, then settle: a dolly is never linear */
    float smear = vnoise(vec2(ang*24.0 + u_seed*6.0, r*3.0 - ease*10.0));  /* fine in angle, stretched along r */
    smear += 0.5*vnoise(vec2(ang*52.0 + u_seed*3.0, r*2.0 - ease*14.0));
    smear = pow(smoothstep(0.38, 1.10, smear), 1.4);   /* a soft ramp: hard steps read as ink speed-lines */
    float reach = smoothstep(0.05, 0.58, r);           /* travel grows with radius, zero at the centre */
    float rim = smoothstep(0.30, 0.78, r);             /* the frame edge compresses and goes dark */
    float bloom = smoothstep(0.20, 0.0, r) * ease;     /* centre flares brightest at peak speed */
    float rays = smear * reach;
    vec3 col = mix(vec3(0.07, 0.07, 0.09), vec3(0.94, 0.96, 1.0), clamp(rays + bloom, 0.0, 1.0));
    c = vec4(col, (rays*0.60 + bloom*0.50 + rim*0.28) * bell);
  }`;
export const blurb = 'a dolly punch-in used as a cut cover: the camera lunges forward and the join hides inside the lunge.';
