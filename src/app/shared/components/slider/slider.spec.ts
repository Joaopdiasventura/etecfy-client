import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Slider } from './slider';

describe('Slider', () => {
  let component: Slider;
  let fixture: ComponentFixture<Slider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Slider]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Slider);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
